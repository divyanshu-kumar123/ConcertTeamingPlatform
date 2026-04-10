import axios from 'axios';
import { store } from '../store';
import { logout } from '../features/auth/authSlice';
import toast from 'react-hot-toast';

// Create a custom instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR: Automatically attach the token to every request
api.interceptors.request.use(
  (config) => {
    // We grab the token directly from localStorage to avoid circular dependency issues with Redux
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

// RESPONSE INTERCEPTOR: Global Error Handling
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const message = error.response?.data?.message || 'Something went wrong';

    // If the server says the token is invalid/expired (401), force logout
    if (error.response?.status === 401) {
      // Dispatch the logout action to our Redux store
      store.dispatch(logout());
      
      // Don't show toast if it's just a failed login attempt (we handle that on the login page)
      if (error.config.url !== '/auth/login') {
         toast.error('Session expired. Please log in again.');
      }
    }

    return Promise.reject(error);
  }
);

export default api;