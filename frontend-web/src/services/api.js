import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error status codes
      switch (error.response.status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
            toast.error('Session expired. Please login again.');
          }
          break;
        case 403:
          toast.error('You do not have permission to perform this action');
          break;
        case 404:
          toast.error('Resource not found');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(error.response.data?.message || 'Something went wrong');
      }
    } else if (error.request) {
      toast.error('Cannot connect to server. Please check your connection.');
    } else {
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
};

// User APIs
export const userAPI = {
  getProfile: (userId) => api.get(`/users/profile/${userId}`),
  updateProfile: (data) => api.put('/users/profile', data),
  addSkill: (data) => api.post('/users/skills', data),
  getMatches: () => api.get('/users/matches'),
};

// Skill APIs
/*export const skillAPI = {
  getAll: (params) => api.get('/skills', { params }),
  getCategories: () => api.get('/skills/categories'),
  search: (query) => api.get('/skills/search', { params: { q: query } }),
};*/

// Session APIs
export const sessionAPI = {
  create: (data) => api.post('/sessions', data),
  getAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  updateStatus: (id, status) => api.put(`/sessions/${id}/status`, { status }),
  rate: (id, rating, review) => api.post(`/sessions/${id}/rate`, { rating, review }),
};

// Chat APIs
export const chatAPI = {
  getConversations: () => api.get('/chats'),
  getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId, message) => api.post(`/chats/${chatId}/messages`, { message }),
};
// Add to your existing api.js file

// Skill APIs
export const skillAPI = {
  // Get all skills with optional filters
  getAll: (params) => api.get('/skills', { params }),
  
  // Get skill categories
  getCategories: () => api.get('/skills/categories'),
  
  // Search skills
  search: (query) => api.get('/skills/search', { params: { q: query } }),
  
  // Get popular skills
  getPopular: () => api.get('/skills/popular'),
  
  // Add a new skill (admin only)
  create: (skillData) => api.post('/skills', skillData),
};

// User Skills APIs
export const userSkillAPI = {
  // Add skill user wants to teach
  addTeachingSkill: (skillData) => api.post('/users/skills/teach', skillData),
  
  // Add skill user wants to learn
  addLearningSkill: (skillData) => api.post('/users/skills/learn', skillData),
  
  // Remove a teaching skill
  removeTeachingSkill: (skillId) => api.delete(`/users/skills/teach/${skillId}`),
  
  // Remove a learning skill
  removeLearningSkill: (skillId) => api.delete(`/users/skills/learn/${skillId}`),
  
  // Update skill experience level
  updateSkillExperience: (skillId, experience) => 
    api.put(`/users/skills/teach/${skillId}`, { experience }),
};

// Matching APIs
export const matchAPI = {
  // Get potential matches based on skills
  getMatches: () => api.get('/users/matches'),
  
  // Get mutual matches (two-way exchange)
  getMutualMatches: () => api.get('/users/matches/mutual'),
  
  // Get skill suggestions based on user's skills
  getSuggestions: () => api.get('/users/matches/suggestions'),
};

export default api;