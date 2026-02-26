import axios from 'axios';

// ✅ Correct backend URL
const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30s
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = localStorage.getItem('authToken');
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
  (response) => {
    console.log(`✅ API Success: ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
    
    
    let userMessage = 'An unexpected error occurred';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      userMessage = 'Request timed out. The server is taking too long to respond.';
    } else if (error.response?.status === 401) {
      // If it's a login attempt, use the server's error message if available
      if (error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register')) {
        userMessage = error.response.data?.error || 'Invalid credentials. Please try again.';
      } else {
        userMessage = 'Your session has expired or is invalid. Please login again.';
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 404) {
      userMessage = 'API endpoint not found. Check if backend is running.';
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      userMessage = 'Cannot connect to backend server. Make sure it\'s running on port 8080 and MongoDB is active.';
    } else if (error.response?.data?.error) {
      userMessage = error.response.data.error;
    }

    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

// Test backend connection
export const testBackendConnection = async () => {
  try {
    const response = await api.get('/health');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.userMessage || 'Cannot connect to backend server',
      details: `Backend URL: ${API_BASE_URL}`
    };
  }
};

// Buses API
export const busesAPI = {
  getBuses: async () => {
    try {
      const response = await api.get('/buses');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Error fetching buses. Please try again.'
      };
    }
  },

  searchBuses: async (filters) => {
    try {
      // Get all buses and filter client-side
      const response = await api.get('/buses');
      let buses = response.data;

      if (filters.from) {
        buses = buses.filter(bus => 
          bus.route.from.toLowerCase().includes(filters.from.toLowerCase())
        );
      }
      
      if (filters.to) {
        buses = buses.filter(bus => 
          bus.route.to.toLowerCase().includes(filters.to.toLowerCase())
        );
      }

      return { success: true, data: buses };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Error searching buses. Please try again.'
      };
    }
  },

  getBus: async (id) => {
    try {
      const response = await api.get(`/buses/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Error fetching bus details.'
      };
    }
  },

  getBusSeats: async (busId, date) => {
    try {
      const response = await api.get(`/buses/${busId}/seats?date=${date}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Error fetching bus seats.'
      };
    }
  }
};

// Auth API
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Registration failed. Please try again.'
      };
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Login failed. Please check your credentials.'
      };
    }
  },

  googleLogin: async (token) => {
    try {
      const response = await api.post('/auth/google', { token });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Google Login failed. Please try again.'
      };
    }
  }
};

// Bookings API
export const bookingsAPI = {
  createBooking: async (bookingData) => {
    try {
      const response = await api.post('/bookings', bookingData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Booking failed. Please try again.'
      };
    }
  },

  getUserBookings: async () => {
    try {
      const response = await api.get('/bookings/user');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Error fetching bookings.'
      };
    }
  },

  cancelBooking: async (id) => {
    try {
      const response = await api.delete(`/bookings/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.userMessage || 'Cancellation failed.'
      };
    }
  }
};

// Utility functions
export const setAuthData = (token, user) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('authToken');
};

export default api;