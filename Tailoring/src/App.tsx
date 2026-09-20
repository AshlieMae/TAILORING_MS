import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/LogIn';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './dashboard/AdminDashboard';
import Frontdeskdashboard from './dashboard/Frontdeskdashboard';
import Customerdashboard from './dashboard/Customerdashboard';
import Mastertailordashboard from './dashboard/Mastertailordashboard';
import CompleteProfile from './pages/CompleteProfile';
import { CustomerOrdersView } from './pages/CustomerOrders';
import { CustomerAppointmentsView } from './pages/CustomerAppointments';
import { FrontDeskCustomersExactView } from './Pages_Frontdesk/CustomersdeskExact';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

function RequireRole({ children, role }: { children: React.ReactNode; role: 'admin' | 'front_desk' | 'tailor' | 'customer' }) {
  const user = currentUser();
  return user?.role === role ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireCompleteStaffProfile({ children, role }: { children: React.ReactNode; role: 'front_desk' | 'tailor' }) {
  const user = currentUser();
  const [verified, setVerified] = React.useState<null | { ok: boolean; profile_completed: boolean }>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken()}` } });
        const data = await res.json();
        const pc = data?.user?.profile_completed ?? user?.profile_completed ?? false;
        if (!cancelled) {
          setVerified({ ok: res.ok, profile_completed: !!pc });
          // Sync the cached session so the rest of the app agrees.
          const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
          if (user) storage.setItem('currentUser', JSON.stringify({ ...user, profile_completed: !!pc }));
        }
      } catch {
        if (!cancelled) setVerified({ ok: !!user, profile_completed: !!user?.profile_completed });
      }
    })();
    return () => { cancelled = true; };
  }, [role]); /* eslint-disable-line */

  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  // While the authoritative check is in flight, trust the cached flag to avoid flashing.
  if (verified === null) return user.profile_completed ? <>{children}</> : null;
  if (!verified.profile_completed) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
}


const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
      <Route path="/customers" element={<RequireRole role="admin"><AdminDashboard initialView="customers" /></RequireRole>} />
      <Route path="/orders" element={<RequireRole role="admin"><AdminDashboard initialView="orders" /></RequireRole>} />
      <Route path="/garment-catalog" element={<RequireRole role="admin"><AdminDashboard initialView="catalog" /></RequireRole>} />
      <Route path="/production" element={<RequireRole role="admin"><AdminDashboard initialView="production" /></RequireRole>} />
      <Route path="/inventory" element={<RequireRole role="admin"><AdminDashboard initialView="inventory" /></RequireRole>} />
      <Route path="/payments" element={<RequireRole role="admin"><AdminDashboard initialView="payments" /></RequireRole>} />
      <Route path="/reports" element={<RequireRole role="admin"><AdminDashboard initialView="reports" /></RequireRole>} />
      <Route path="/settings" element={<RequireRole role="admin"><AdminDashboard initialView="settings" /></RequireRole>} />
      <Route path="/frontdesk" element={<RequireCompleteStaffProfile role="front_desk"><Frontdeskdashboard /></RequireCompleteStaffProfile>} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/customer" element={<RequireRole role="customer"><Customerdashboard /></RequireRole>} />
      <Route path="/my-orders" element={<RequireRole role="customer"><CustomerOrdersView /></RequireRole>} />
      <Route path="/my-appointments" element={<RequireRole role="customer"><CustomerAppointmentsView /></RequireRole>} />
      <Route path="/customerdesk" element={<RequireRole role="front_desk"><FrontDeskCustomersExactView /></RequireRole>} />
      <Route path="/master" element={<RequireCompleteStaffProfile role="tailor"><Mastertailordashboard /></RequireCompleteStaffProfile>} />
      <Route path="/usermanagement" element={<AdminDashboard initialView="users" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
