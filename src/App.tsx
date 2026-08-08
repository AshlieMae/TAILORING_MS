import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Login from './pages/LogIn';
import AdminDashboard from './dashboard/AdminDashboard';
import Frontdeskdashboard from './dashboard/Frontdeskdashboard';
import Customerdashboard from './dashboard/Customerdashboard';
import Mastertailordashboard from './dashboard/Mastertailordashboard';
import CompleteProfile from './pages/CompleteProfile';

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

function RequireCompleteFrontDeskProfile({ children }: { children: React.ReactNode }) {
  const user = currentUser();
  if (!user || user.role !== 'front_desk') return <Navigate to="/login" replace />;
  if (!user.profile_completed) return <Navigate to="/complete-profile" replace />;
  return <>{children}</>;
}


const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/frontdesk" element={<RequireCompleteFrontDeskProfile><Frontdeskdashboard /></RequireCompleteFrontDeskProfile>} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/customer" element={<Customerdashboard />} />
      <Route path="/master" element={<Mastertailordashboard />} />
      <Route path="/usermanagement" element={<AdminDashboard initialView="users" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
