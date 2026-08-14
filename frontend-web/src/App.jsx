// frontend-web/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SkillMarketplace from './pages/SkillMarketplace';
import Matches from './pages/Matches';
import MutualMatches from './pages/MutualMatches';  // ✅ Add this
import TeacherProfile from './pages/TeacherProfile';
import Sessions from './pages/Sessions';
import Messages from './pages/Messages';
import ForgotPassword from './pages/ForgotPassword';
import CreateExam from './pages/teacher/CreateExam';
import TeacherExams from './pages/teacher/TeacherExams';
import ExamMonitor from './pages/teacher/ExamMonitor';
import StudentExams from './pages/student/StudentExams';
import ExamTaking from './pages/ExamTaking';
import Certificate from './components/exam/Certificate';
import VerifyCertificate from './components/exam/VerifyCertificate';
import AdminDashboard from './pages/admin/AdminDashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AdminUserDetails from './pages/admin/AdminUserDetails';

// Import toast for error messages
import toast from 'react-hot-toast';

// Protected Route Component (for regular users)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // If user is admin, redirect to admin dashboard
  if (user?.role === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  return children;
};

// Admin Route Component (for admin only)
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Check if user is admin
  if (user.role !== 'admin') {
    toast.error('Access denied. Admin privileges required.');
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Public Route Component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === 'admin') {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

// Root Redirect Component
const RootRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Home />;
  }
  
  // Redirect based on user role
  if (user?.role === 'admin') {
    return <Navigate to="/admin" />;
  }
  
  return <Navigate to="/dashboard" />;
};

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-50">
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
          {/* Root route - dynamic redirect based on auth status and role */}
          <Route path="/" element={<RootRedirect />} />
          
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
          
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          
          {/* Protected user routes */}
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
          
          {/* ✅ Add Mutual Matches route */}
          <Route path="/mutual-matches" element={
            <ProtectedRoute>
              <MutualMatches />
            </ProtectedRoute>
          } />
          
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
          
          {/* Exam routes */}
          <Route path="/teacher/exams/create" element={
            <ProtectedRoute>
              <CreateExam />
            </ProtectedRoute>
          } />

          <Route path="/teacher/exams/:examId/edit" element={
            <ProtectedRoute>
              <CreateExam />
            </ProtectedRoute>
          } />
          
          <Route path="/teacher/exams" element={
            <ProtectedRoute>
              <TeacherExams />
            </ProtectedRoute>
          } />

          <Route path="/teacher/exams/:examId/monitor" element={
            <ProtectedRoute>
              <ExamMonitor />
            </ProtectedRoute>
          } />
          
          <Route path="/exams" element={
            <ProtectedRoute>
              <StudentExams />
            </ProtectedRoute>
          } />
          
          <Route path="/exams/:examId/take" element={
            <ProtectedRoute>
              <ExamTaking />
            </ProtectedRoute>
          } />
          
          {/* Certificate routes */}
          <Route path="/certificate/:certificateId" element={
            <ProtectedRoute>
              <Certificate />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
} />
          
          <Route path="/verify/:certificateId" element={
            <VerifyCertificate />
          } />
          <Route path="/settings" element={
  <ProtectedRoute>
    <Settings />
  </ProtectedRoute>
} />
<Route path="/admin/users/:userId" element={
  <AdminRoute>
    <AdminUserDetails />
  </AdminRoute>
} />
          {/* Catch all - 404 redirect */}
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