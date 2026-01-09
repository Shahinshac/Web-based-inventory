/**
 * @file Login.jsx
 * @description Authentication component with login and registration
 * Self-contained component that manages its own form state
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

/**
 * Login Component
 * 
 * Self-contained authentication component with:
 * - Login form with username/password
 * - Registration form with username/email/password
 * - Remember me functionality
 * - Password visibility toggle
 * - Form validation
 * - Loading states
 * - Error display
 */
const Login = ({ onLogin, onRegister }) => {
  // ==================== STATE ====================
  
  // Tab state
  const [showLoginPage, setShowLoginPage] = useState(true);
  
  // Login form state
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  
  // Register form state
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ==================== EFFECTS ====================

  /**
   * Load remembered username on mount
   */
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedUser');
      if (remembered) {
        setAuthUsername(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered user:', error);
    }
  }, []);

  /**
   * Save/remove remembered username based on checkbox
   */
  useEffect(() => {
    try {
      if (rememberMe && authUsername) {
        localStorage.setItem('rememberedUser', authUsername);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedUser');
      }
    } catch (error) {
      console.error('Failed to update remembered user:', error);
    }
  }, [rememberMe, authUsername]);

  // ==================== HANDLERS ====================

  /**
   * Handle login form submission
   */
  const onLoginSubmit = useCallback(async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!authUsername || !authPassword) {
      setAuthError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      const result = await onLogin(authUsername, authPassword);
      if (result && result.error) {
        setAuthError(result.error);
      }
    } catch (error) {
      setAuthError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authUsername, authPassword, onLogin]);

  /**
   * Handle registration form submission
   */
  const onRegisterSubmit = useCallback(async (e) => {
    e.preventDefault();
    setRegisterError('');
    
    if (!registerUsername || !registerEmail || !registerPassword) {
      setRegisterError('Please fill in all fields');
      return;
    }
    
    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const result = await onRegister(registerUsername, registerPassword, registerEmail);
      if (result && result.error) {
        setRegisterError(result.error);
      } else if (result && result.success) {
        // Show success and switch to login
        setRegisterError('');
        alert('Registration successful! Please wait for admin approval.');
        setShowLoginPage(true);
        setRegisterUsername('');
        setRegisterEmail('');
        setRegisterPassword('');
      }
    } catch (error) {
      setRegisterError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [registerUsername, registerEmail, registerPassword, onRegister]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // ==================== RENDER HELPERS ====================

  const isLoginValid = authUsername && authPassword;
  const isRegisterValid = registerUsername && registerEmail && registerPassword && registerPassword.length >= 6;
  const currentYear = new Date().getFullYear();

  // ==================== RENDER ====================

  return (
    <div className="login-page">
      <div className="login-wrapper">
        
        {/* ==================== BRANDING SIDE ==================== */}
        <div className="login-brand-side">
          <div className="brand-inner">
            {/* Logo */}
            <div className="brand-logo-box">
              <Icon name="spark" size={36} />
            </div>
            
            {/* Brand name */}
            <h1 className="brand-name">Shahinsha's Inventory</h1>
            <p className="brand-tagline">Smart Inventory Management System</p>
            
            {/* Features list */}
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

        {/* ==================== FORM SIDE ==================== */}
        <div className="login-form-side">
          <div className="login-box">
            
            {/* Tab Navigation */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(true)}
                aria-label="Switch to login"
              >
                <Icon name="lock" size={16} />
                Login
              </button>
              <button
                type="button"
                className={`login-tab ${!showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(false)}
                aria-label="Switch to register"
              >
                <Icon name="add" size={16} />
                Register
              </button>
            </div>

            {/* ==================== LOGIN FORM ==================== */}
            {showLoginPage ? (
              <div className="login-content">
                <div className="login-header">
                  <h2>Welcome Back!</h2>
                  <p>Please login to continue</p>
                </div>

                <form onSubmit={onLoginSubmit} className="login-form">
                  {/* Username field */}
                  <div className="field">
                    <label htmlFor="login-username">
                      <Icon name="customers" size={14} />
                      Username
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>

                  {/* Password field */}
                  <div className="field">
                    <label htmlFor="login-password">
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="password-field">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <Icon name={showPassword ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Remember me checkbox */}
                  <label className="remember-me" htmlFor="remember-me">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  {/* Error message */}
                  {authError && (
                    <div className="error-msg" role="alert">
                      <Icon name="close" size={14} />
                      {authError}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !isLoginValid}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                {/* Notice */}
                <div className="notice">
                  <Icon name="lock" size={14} />
                  <span>Admin credentials required for owner access</span>
                </div>
              </div>
            ) : (
              <>
              {/* ==================== REGISTER FORM ==================== */}
              <div className="login-content">
                <div className="login-header">
                  <h2>Create Account</h2>
                  <p>Sign up to get started</p>
                </div>

                <form onSubmit={onRegisterSubmit} className="login-form">
                  {/* Username field */}
                  <div className="field">
                    <label htmlFor="register-username">
                      <Icon name="customers" size={14} />
                      Username
                    </label>
                    <input
                      id="register-username"
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder="Choose username (min 3 chars)"
                      required
                      minLength="3"
                      autoFocus
                      autoComplete="username"
                    />
                  </div>

                  {/* Email field */}
                  <div className="field">
                    <label htmlFor="register-email">
                      <Icon name="email" size={14} />
                      Email
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                      autoComplete="email"
                    />
                  </div>

                  {/* Password field */}
                  <div className="field">
                    <label htmlFor="register-password">
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="password-field">
                      <input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Create password (min 6 chars)"
                        required
                        minLength="6"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <Icon name={showPassword ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Error message */}
                  {registerError && (
                    <div className="error-msg" role="alert">
                      <Icon name="close" size={14} />
                      {registerError}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="submit-btn register"
                    disabled={loading || !isRegisterValid}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </form>

                {/* Notice */}
                <div className="notice">
                  <Icon name="check" size={14} />
                  <span>Admin will review and approve your access</span>
                </div>
              </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="login-footer-text">
            &copy; {currentYear} Shahinsha's Inventory
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PropTypes validation
 */
Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onRegister: PropTypes.func.isRequired,
};

export default Login;
