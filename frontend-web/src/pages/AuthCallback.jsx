import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    // Prevent duplicate handling (React Strict Mode runs effects twice in dev)
    const dedupeKey = token ? `oauth:token:${token.slice(0, 32)}` : error ? `oauth:error:${error}` : null;
    if (dedupeKey && sessionStorage.getItem(dedupeKey)) return;
    if (dedupeKey) sessionStorage.setItem(dedupeKey, '1');

    const finish = async () => {
      if (error) {
        toast.error(decodeURIComponent(error));
        navigate('/login', { replace: true });
        return;
      }

      if (!token) {
        toast.error('Login failed — no token received');
        navigate('/login', { replace: true });
        return;
      }

      const result = await completeOAuthLogin(token);
      if (result.success) {
        // Clear token from URL before navigating (avoids leaking JWT in history)
        window.history.replaceState({}, '', '/auth/callback');
        toast.success('Login successful!');
        navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        toast.error(result.error || 'Login failed');
        navigate('/login', { replace: true });
      }
    };

    finish();
  }, [completeOAuthLogin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Completing sign in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
