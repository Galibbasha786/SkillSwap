// frontend-web/src/services/api.js

import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('🔌 API URL:', API_URL);

let lastBackendDownToastAt = 0;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    if (import.meta.env.DEV) {
      console.log('🚀 Request:', {
        method: config.method.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        token: token ? 'Present' : 'Missing'
      });
    }
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
      toast.error('Request timed out. The server may be waking up — please try again.');
    } else if (error.response) {
      console.error('❌ Server Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      const message = error.response.data?.message || 'Server error';
      toast.error(message);
      
      if (error.response.status === 401) {
        const code = error.response.data?.code;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { code } }));
        if (code === 'SESSION_REPLACED') {
          toast.error('Logged out — your account was used on another device.');
        }
      }
    } else if (error.request) {
      console.error('❌ Network Error - No Response:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      const now = Date.now();
      if (now - lastBackendDownToastAt > 12000) {
        lastBackendDownToastAt = now;
        toast.error('Cannot reach the server. It may be waking up — please wait and try again.');
      }
    } else {
      console.error('❌ Error:', error.message);
      toast.error('An error occurred');
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  googleLogin: (data) => api.post('/auth/google', data),
  sendOTP: (data) => api.post('/auth/send-otp', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ==================== USER APIs ====================
// frontend-web/src/services/api.js
// Remove the duplicate updateProfile at line 86, keep only this one:

export const userAPI = {
  getProfile: (userId) => {
    if (!userId) {
      return Promise.reject(new Error('User ID is required'));
    }
    return api.get(`/users/profile/${userId}`);
  },
  updateProfile: (data) => {
    console.log('📤 Updating profile with data:', data);
    return api.put('/users/profile', data);
  },
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
  uploadProfileImage: (formData) => api.post('/users/upload-profile-image', formData),
  removeProfileImage: () => api.delete('/users/profile-image'),
  getMatches: () => api.get('/users/matches'),
  getMutualMatches: () => api.get('/users/mutual-matches'),
};

// ==================== SKILL APIs ====================
export const skillAPI = {
  getAll: (params) => api.get('/skills', { params }),
  getCategories: () => api.get('/skills/categories'),
  search: (query) => api.get('/skills/search', { params: { q: query } }),
  getPopular: () => api.get('/skills/popular'),
};

// ==================== MATCH APIs ====================
export const matchAPI = {
  getMatches: () => api.get('/users/matches'),
  getMutualMatches: () => api.get('/users/mutual-matches'),
};

// ==================== SESSION APIs ====================
export const sessionAPI = {
  create: (sessionData) => api.post('/sessions', sessionData),
  getAll: (params) => api.get('/sessions', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
  updateStatus: (id, status) => api.put(`/sessions/${id}/status`, { status }),
  completeSession: (id) => api.put(`/sessions/${id}/complete`),
  rate: (id, rating, review) => api.post(`/sessions/${id}/rate`, { rating, review }),
  cancelSession: (id, data) => api.post(`/sessions/${id}/cancel`, data),
  deleteSession: (id) => api.delete(`/sessions/${id}`),
};

// ==================== CHAT APIs ====================
export const chatAPI = {
  getConversations: () => api.get('/chats'),
  getMessages: (chatId) => api.get(`/chats/${chatId}/messages`),
  sendMessage: (chatId, message) => api.post(`/chats/${chatId}/messages`, { message }),
  createChat: (data) => api.post('/chats', data),
  markAsRead: (chatId) => api.put(`/chats/${chatId}/read`),
  getParticipantDetails: (userId) => api.get(`/chats/participant/${userId}`),
};

// ==================== PAYMENT APIs ====================
export const paymentAPI = {
  createPaymentIntent: (sessionId) => api.post('/payments/create-payment-intent', { sessionId }),
  confirmPayment: (data) => api.post('/payments/confirm', data),
  getEarnings: () => api.get('/payments/earnings'),
  getTransactions: () => api.get('/payments/transactions'),
  requestWithdrawal: (data) => api.post('/payments/withdraw', data),
  createUPIPayment: (data) => api.post('/payments/create-upi-payment', data),
  verifyUPIPayment: (data) => api.post('/payments/verify-upi-payment', data),
};

// ==================== RAZORPAY APIs ====================
export const razorpayAPI = {
  createOrder: (sessionId) => api.post('/razorpay/create-order', { sessionId }),
  verifyPayment: (data) => api.post('/razorpay/verify', data),
  testRazorpay: () => api.post('/razorpay/test'),
};

// ==================== WALLET APIs ====================
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  requestWithdrawal: (data) => api.post('/wallet/withdraw', data),
  getWithdrawals: () => api.get('/wallet/withdrawals'),
  addBankAccount: (data) => api.post('/wallet/add-bank-account', data),
  getBankAccount: () => api.get('/wallet/bank-account'),
};

// ==================== EXAM APIs ====================
// frontend-web/src/services/api.js
// Update your examAPI section to this:

export const examAPI = {
  createExam: (examData) => api.post('/exams', examData),
  updateExam: (examId, examData) => api.put(`/exams/${examId}`, examData),
  getTeacherExams: () => api.get('/exams/teacher'),
  getAvailableExams: () => api.get('/exams/available'),
  getLiveAttempts: (examId) => api.get(`/exams/${examId}/live-attempts`),
  getExamResults: (examId) => api.get(`/exams/${examId}/results`),
  publishExamResults: (examId) => api.post(`/exams/${examId}/publish-results`),
  updateAttemptGrade: (examId, attemptId, data) =>
    api.put(`/exams/${examId}/attempts/${attemptId}/grade`, data),
  getExamById: (examId) => api.get(`/exams/${examId}`), // ✅ ADD THIS - Missing!
  startExam: (examId, data = {}) => api.post(`/exams/${examId}/start`, data),
  submitAnswer: (examId, answerData) => api.post(`/exams/${examId}/submit`, answerData),
  finishExam: (examId) => api.post(`/exams/${examId}/finish`),
  recordViolation: (examId, violation) => api.post(`/exams/${examId}/violation`, violation),
  cancelExam: (examId, data) => api.post(`/exams/${examId}/cancel`, data),
  rescheduleExam: (examId, data) => api.post(`/exams/${examId}/reschedule`, data),
  removeStudentFromExam: (examId, studentId) => api.post(`/exams/${examId}/remove-student/${studentId}`),
  deleteExam: (examId) => api.delete(`/exams/${examId}`),
  verifyExamAccess: (examId, data) => api.post(`/exams/${examId}/verify-access`, data), // ✅ ADD THIS for access control
  runCode: (examId, data) =>
    api.post(`/exams/${examId}/run-code`, data, { timeout: 30000 }),
  submitCoding: (examId, data) => api.post(`/exams/${examId}/submit-coding`, data),
  getPracticeExam: (examId) => api.get(`/exams/${examId}/practice`),
  submitPractice: (examId, data) => api.post(`/exams/${examId}/practice/submit`, data),
};

export const compilerAPI = {
  getLanguages: () => api.get('/compiler/languages'),
  run: (data) => api.post('/compiler/run', data, { timeout: 30000 }),
};

export const postAPI = {
  getAll: (params) => api.get('/posts', { params }),
  getById: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  delete: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
  getCategories: () => api.get('/posts/meta/categories'),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  addComment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
  share: (id, message = '') => api.post(`/posts/${id}/share`, { message }),
};

// ==================== CERTIFICATE APIs ====================
export const certificateAPI = {
  getCertificate: (id) => api.get(`/certificates/${id}`),
  downloadCertificate: (id) => api.get(`/certificates/${id}/download`, {
    responseType: 'blob'
  }),
  verifyCertificate: (certificateId) => api.get(`/certificates/verify/${certificateId}`),
  downloadPublicCertificate: (certificateId) => api.get(`/certificates/verify/${certificateId}/download`, {
    responseType: 'blob'
  }),
};

// ==================== GOOGLE MEET APIs ====================
export const meetAPI = {
  createMeetLink: (data) => api.post('/meet/create', data),
  createSimpleRoom: (data) => api.post('/meet/create-room', data),
  getCalendarInfo: () => api.get('/meet/calendar'),
};

// ==================== NOTIFICATION APIs ====================
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// ==================== RATING APIs ====================
export const ratingAPI = {
  rateSession: (sessionId, data) => api.post(`/ratings/session/${sessionId}`, data),
  getUserRatings: (userId, params) => api.get(`/ratings/user/${userId}`, { params }),
  canRateSession: (sessionId) => api.get(`/ratings/session/${sessionId}/can-rate`),
};

// ==================== SWAP APIs ====================
export const swapAPI = {
  createFreeSwap: (data) => api.post('/swaps/create', data),
  getPendingSwaps: () => api.get('/swaps/pending'),
  getCompletedSwaps: () => api.get('/swaps/completed'),
};

// ==================== ADMIN APIs ====================
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  getWithdrawalDetails: (id) => api.get(`/admin/withdrawals/${id}`),
  approveWithdrawal: (id, data = {}) => api.post(`/admin/withdrawals/${id}/approve`, data),
  completeWithdrawal: (id, data) => api.post(`/admin/withdrawals/${id}/complete`, data),
  rejectWithdrawal: (id, data) => api.post(`/admin/withdrawals/${id}/reject`, data),
  sendWithdrawalMessage: (id, data) => api.post(`/admin/withdrawals/${id}/message`, data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, data) => api.put(`/admin/users/${id}/status`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getTransactions: (params) => api.get('/admin/transactions', { params }),
  sendNotificationToAll: (data) => api.post('/admin/notifications/send-to-all', data),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
};
export const rewardsAPI = {
  getBalance: () => api.get('/rewards/balance'),
  getHistory: () => api.get('/rewards/history'),
  redeemFreeSession: (data) => api.post('/rewards/redeem-free-session', data)
};

export const timeSlotAPI = {
  // Get all time slots for a teacher
  getTeacherSlots: (teacherId) => api.get(`/timeslots/teacher/${teacherId}`),
  
  // Create a new time slot
  create: (data) => api.post('/timeslots', data),
  
  // Update a time slot
  update: (slotId, data) => api.put(`/timeslots/${slotId}`, data),
  
  // Delete a time slot
  delete: (slotId) => api.delete(`/timeslots/${slotId}`),
  
  // Check availability for a specific date/time
  checkAvailability: (teacherId, date, startTime, endTime) => 
    api.get(`/timeslots/check/${teacherId}`, {
      params: { date, startTime, endTime }
    }),
  
  // Get available slots for a specific week
  getAvailableSlotsForWeek: (teacherId, startDate) =>
    api.get(`/timeslots/week/${teacherId}`, {
      params: { startDate }
    })
};

export default api;
