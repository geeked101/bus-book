import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, setAuthData, clearAuthData, getCurrentUser } from '../services/api';

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

  // Check if user is logged in on component mount
  useEffect(() => {
    const userData = getCurrentUser();
    
    console.log('AuthProvider mounting - user:', userData); // Debug log
    
    if (userData) {
      setUser(userData);
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    console.log('AuthContext login called with:', { email, password }); // Debug log
    
    const result = await authAPI.login({ email, password });
    
    if (result.success) {
      const { user, token } = result.data;
      setAuthData(token, user);
      setUser(user);
      console.log('Login successful, user set:', user);
      return { success: true, user };
    } else {
      console.error('Login error:', result.error);
      return { success: false, error: result.error };
    }
  };

  // Register function
  const register = async (userData) => {
    console.log('AuthContext register called with:', userData); // Debug log
    
    const result = await authAPI.register(userData);
    
    if (result.success) {
      const { user, token } = result.data;
      setAuthData(token, user);
      setUser(user);
      console.log('Registration successful, user set:', user);
      return { success: true, user };
    } else {
      console.error('Registration error:', result.error);
      return { success: false, error: result.error };
    }
  };

  // Google Login function
  const loginWithGoogle = async (token) => {
    console.log('AuthContext loginWithGoogle called');
    const result = await authAPI.googleLogin(token);
    
    if (result.success) {
      const { user, token: authToken } = result.data;
      setAuthData(authToken, user);
      setUser(user);
      console.log('Google login successful, user set:', user);
      return { success: true, user };
    } else {
      console.error('Google login error:', result.error);
      return { success: false, error: result.error };
    }
  };

  // Logout function
  const logout = () => {
    console.log('AuthContext logout called'); // Debug log
    clearAuthData();
    setUser(null);
    // Use window.location for reliable redirect
    window.location.href = '/login';
  };

  const value = {
    user,
    login,
    register,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;