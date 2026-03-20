import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('🔌 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

getProfile: (userId) => {
  if (!userId) {
    console.error('getProfile called with undefined userId');
    // Try to get from localStorage as fallback
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      userId = parsedUser.id;
      console.log('Using userId from localStorage:', userId);
    } else {
      return Promise.reject(new Error('User ID is required and not available'));
    }
  }
  return api.get(`/users/profile/${userId}`);
},
// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 Request:', {
      method: config.method.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      token: token ? 'Present' : 'Missing'
    });
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout Error');
      toast.error('Request timeout. Please try again.');
    } else if (error.response) {
      // Server responded with error
      console.error('❌ Server Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      const message = error.response.data?.message || 'Server error';
      toast.error(message);
      
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Request made but no response
      console.error('❌ Network Error - No Response:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      toast.error('Cannot connect to server. Make sure backend is running on port 5001');
    } else {
      // Something else happened
      console.error('❌ Error:', error.message);
      toast.error('An error occurred');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  googleLogin: (data) => api.post('/auth/google', data),
};

// User APIs
export const userAPI = {
  getProfile: (userId) => {
    if (!userId) {
      return Promise.reject(new Error('User ID is required'));
    }
    return api.get(`/users/profile/${userId}`);
  },
  updateProfile: (data) => api.put('/users/profile', data),
  getAllTeachers: () => api.get('/users/teachers'),
  addTeachingSkill: (skillData) => {
    console.log('Adding teaching skill:', skillData);
    return api.post('/users/skills/teach', skillData);
  },
  addLearningSkill: (skillData) => {
    console.log('Adding learning skill:', skillData);
    return api.post('/users/skills/learn', skillData);
  },
  removeTeachingSkill: (skillName) => api.delete(`/users/skills/teach/${encodeURIComponent(skillName)}`),
  removeLearningSkill: (skillName) => api.delete(`/users/skills/learn/${encodeURIComponent(skillName)}`),
};

// Skill APIs
export const skillAPI = {
  getAll: (params) => api.get('/skills', { params }),
  getCategories: () => api.get('/skills/categories'),
  search: (query) => api.get('/skills/search', { params: { q: query } }),
  getPopular: () => api.get('/skills/popular'),
};

// Match APIs
export const matchAPI = {
  getMatches: () => api.get('/users/matches'),
  getMutualMatches: () => api.get('/users/matches/mutual'),
};

// Session APIs
export const sessionAPI = {
  create: (sessionData) => api.post('/sessions', sessionData),
  getAll: (params) => api.get('/sessions', { params }),
  updateStatus: (id, status) => api.put(`/sessions/${id}/status`, { status }),
  rate: (id, rating, review) => api.post(`/sessions/${id}/rate`, { rating, review }),
  cancelSession: (id, data) => api.post(`/sessions/${id}/cancel`, data),
deleteSession: (id) => api.delete(`/sessions/${id}`),
};
export const chatAPI = {
  getConversations: () => api.get('/chats'),
  // In api.js, add to chatAPI:
getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId, message) => api.post(`/chats/${chatId}/messages`, { message }),
  createChat: (data) => api.post('/chats', data),
  markAsRead: (chatId) => api.put(`/chats/${chatId}/read`),
};

export default api;
