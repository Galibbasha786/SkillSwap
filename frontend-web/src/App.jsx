
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SkillMarketplace from './pages/SkillMarketplace';
import Matches from './pages/Matches';
import TeacherProfile from './pages/TeacherProfile';  // ✅ Add this import
import Sessions from './pages/Sessions';
import Messages from './pages/Messages';
// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

function AppContent() {
  return (
    <div className="min-h-screen">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            icon: '✅',
            style: {
              background: '#10b981',
            },
          },
          error: {
            icon: '❌',
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      <AnimatePresence mode="wait">
        <Routes>
          {/* Root route */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* Auth routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/marketplace" element={
            <ProtectedRoute>
              <SkillMarketplace />
            </ProtectedRoute>
          } />
          
          <Route path="/matches" element={
            <ProtectedRoute>
              <Matches />
            </ProtectedRoute>
          } />
          
          {/* ✅ Teacher Profile route - dynamic with ID */}
          <Route path="/teacher/:id" element={
            <ProtectedRoute>
              <TeacherProfile />
            </ProtectedRoute>
          } />
          <Route path="/sessions" element={
  <ProtectedRoute>
    <Sessions />
  </ProtectedRoute>
} />
<Route path="/messages" element={
  <ProtectedRoute>
    <Messages />
  </ProtectedRoute>
} />
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
