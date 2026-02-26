import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { authAPI, setAuthData } from '../services/api';
import authBus from '../assets/auth-bus.jpg';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login attempt with:', { email, password }); // Debug log

    try {
      const result = await login(email, password);
      console.log('Login result:', result); // Debug log
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Google Sign-In Success:', credentialResponse);
    setError('');
    setLoading(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Google Login failed');
      }
    } catch (err) {
      setError('An error occurred during Google Login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('Google Sign-In Failed');
    setError('Google Sign-In Failed');
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-image-side" style={{ backgroundImage: `url(${authBus})` }}>
        <div className="auth-image-overlay">
          <h1>Burudani Minty Travels</h1>
          <p>Kenya's Finest Bus Service. Your safety and comfort is our priority.</p>
        </div>
      </div>
      <div className="login-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Burudani Minty Travels</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="google-login-container" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
              />
          </div>

          <p className="register-link">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;