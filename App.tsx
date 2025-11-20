import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { MemberForm } from './pages/MemberForm';
import { PublicMemberView } from './pages/PublicMemberView';
import { Login } from './pages/Login';
import { clearToken } from './services/memberService';

function App() {
  // Simple auth state simulation
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // On mount, check local storage for auth session and seed mock data
  useEffect(() => {
    const session = localStorage.getItem('ong_admin_session');
    if (session === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token: string) => {
    setIsAuthenticated(true);
    localStorage.setItem('ong_admin_session', 'true');
    localStorage.setItem('ong_admin_token', token);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('ong_admin_session');
    localStorage.removeItem('ong_admin_token');
    clearToken();
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {isAuthenticated && <Navbar onLogout={handleLogout} />}
        
        <Routes>
          {/* Public Route: Accessible by anyone scanning the QR */}
          <Route path="/member/:id" element={<PublicMemberView />} />

          {/* Admin Routes: Protected */}
          <Route 
            path="/admin" 
            element={
              isAuthenticated ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/admin/create" 
            element={
              isAuthenticated ? (
                <MemberForm />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          <Route 
            path="/admin/edit/:id" 
            element={
              isAuthenticated ? (
                <MemberForm />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* Home/Login Route */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/admin" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
