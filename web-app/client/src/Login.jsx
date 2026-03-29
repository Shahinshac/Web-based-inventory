/**
 * @file Login.jsx
 * @description Simple authentication component - staff & customer login
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';

const Login = ({ onLogin }) => {
  // State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered username on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedUser');
      if (remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered user:', error);
    }
  }, []);

  // Save/remove remembered username
  useEffect(() => {
    try {
      if (rememberMe && username) {
        localStorage.setItem('rememberedUser', username);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedUser');
      }
    } catch (error) {
      console.error('Failed to update remembered user:', error);
    }
  }, [rememberMe, username]);

  // Handle staff login
  const handleStaffLogin = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(username, password, 'staff');
      if (result && result.error) {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [username, password, onLogin]);

  // Handle customer registration
  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      // Send OTP
      const response = await fetch(API('/api/users/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send OTP');
      }

      // After successful OTP send, show message
      setError('');
      alert(`OTP sent to ${email}. Please check your email to verify and complete registration.`);
      setEmail('');
      setMode('login');
    } catch (error) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Branding Side */}
        <div className="login-brand-side">
          <div className="brand-inner">
            <div className="brand-logo-box">
              <Icon name="spark" size={36} />
            </div>
            <h1 className="brand-name">26:07 Electronics</h1>
            <p className="brand-tagline">Premium Electronics & Smart Solutions</p>
            <div className="brand-list">
              <div className="brand-list-item">
                <Icon name="check" size={16} />
                <span>Real-time Inventory</span>
              </div>
              <div className="brand-list-item">
                <Icon name="check" size={16} />
                <span>Advanced POS System</span>
              </div>
              <div className="brand-list-item">
                <Icon name="check" size={16} />
                <span>Analytics Dashboard</span>
              </div>
              <div className="brand-list-item">
                <Icon name="check" size={16} />
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div className="login-form-side">
          <div className="login-box">
            {/* Tabs */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setError(''); }}
              >
                <Icon name="lock" size={16} />
                Staff Login
              </button>
              <button
                type="button"
                className={`login-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setMode('register'); setError(''); }}
              >
                <Icon name="add" size={16} />
                Customer Register
              </button>
            </div>

            {/* Login Form */}
            {mode === 'login' && (
              <div className="login-content">
                <div className="login-header">
                  <h2>Welcome Back!</h2>
                  <p>Staff login</p>
                </div>

                <form onSubmit={handleStaffLogin} className="login-form">
                  <div className="field">
                    <label htmlFor="username">
                      <Icon name="customers" size={14} />
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="password">
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="password-field">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon name={showPassword ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  {error && (
                    <div className="error-msg">
                      <Icon name="alert-circle" size={14} />
                      {error}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="notice">
                  <Icon name="lock" size={14} />
                  <span>Contact your admin if you need an account</span>
                </div>
              </div>
            )}

            {/* Customer Register Form */}
            {mode === 'register' && (
              <div className="login-content">
                <div className="login-header">
                  <h2>Customer Registration</h2>
                  <p>Create your account</p>
                </div>

                <form onSubmit={handleRegister} className="login-form">
                  <div className="field">
                    <label htmlFor="customer-email">
                      <Icon name="mail" size={14} />
                      Email Address
                    </label>
                    <input
                      id="customer-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="info-box">
                    <Icon name="shield" size={14} />
                    <span>You'll receive an OTP via email to verify your account</span>
                  </div>

                  {error && (
                    <div className="error-msg">
                      <Icon name="alert-circle" size={14} />
                      {error}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>

                <div className="notice">
                  <Icon name="shield" size={14} />
                  <span>We'll never share your email with anyone else</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="login-footer">
            &copy; {currentYear} 26:07 Electronics
          </div>
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;
