
import { useState, useEffect, createContext, useContext } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Ensure user has both id and _id for compatibility
        setUser({
          ...parsedUser,
          id: parsedUser.id || parsedUser._id,
          _id: parsedUser._id || parsedUser.id
        });
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user: userData } = response.data;
      
      // Ensure user object has both id and _id
      const normalizedUser = {
        ...userData,
        id: userData.id || userData._id,
        _id: userData._id || userData.id
      };
      
      // Store both token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      
      toast.success('Login successful!');
      return { success: true, user: normalizedUser };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      
      // Ensure user object has both id and _id
      const normalizedUser = {
        ...newUser,
        id: newUser.id || newUser._id,
        _id: newUser._id || newUser.id
      };
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      
      toast.success('Registration successful!');
      return { success: true, user: normalizedUser };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Helper to get user ID safely
  const getUserId = () => {
    return user?.id || user?._id || null;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    getUserId,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
