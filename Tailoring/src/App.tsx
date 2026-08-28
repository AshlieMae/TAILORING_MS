import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/LogIn';
import AdminDashboard from './dashboard/AdminDashboard';
import Frontdeskdashboard from './dashboard/Frontdeskdashboard';
import Customerdashboard from './dashboard/Customerdashboard';
import Mastertailordashboard from './dashboard/Mastertailordashboard';
import CompleteProfile from './pages/CompleteProfile';
import { CustomerOrdersView } from './pages/CustomerOrders';
import { FrontDeskCustomersExactView } from './Pages_Frontdesk/CustomersdeskExact';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
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
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/customers" element={<AdminDashboard initialView="customers" />} />
      <Route path="/orders" element={<AdminDashboard initialView="orders" />} />
      <Route path="/garment-catalog" element={<AdminDashboard initialView="catalog" />} />
      <Route path="/production" element={<AdminDashboard initialView="production" />} />
      <Route path="/inventory" element={<AdminDashboard initialView="inventory" />} />
      <Route path="/payments" element={<AdminDashboard initialView="payments" />} />
      <Route path="/reports" element={<AdminDashboard initialView="reports" />} />
      <Route path="/settings" element={<AdminDashboard initialView="settings" />} />
      <Route path="/frontdesk" element={<RequireCompleteStaffProfile role="front_desk"><Frontdeskdashboard /></RequireCompleteStaffProfile>} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/customer" element={<Customerdashboard />} />
      <Route path="/my-orders" element={<CustomerOrdersView />} />
      <Route path="/customerdesk" element={<FrontDeskCustomersExactView />} />
      <Route path="/master" element={<RequireCompleteStaffProfile role="tailor"><Mastertailordashboard /></RequireCompleteStaffProfile>} />
      <Route path="/usermanagement" element={<AdminDashboard initialView="users" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
