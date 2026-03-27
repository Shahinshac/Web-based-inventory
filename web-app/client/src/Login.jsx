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
const Login = ({ onLogin }) => {
  // ==================== STATE ====================

  // Login form state
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [userMode, setUserMode] = useState('staff'); // 'staff' or 'customer'
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
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
      const result = await onLogin(authUsername, authPassword, userMode);
      if (result && result.error) {
        setAuthError(result.error);
      }
    } catch (error) {
      setAuthError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authUsername, authPassword, userMode, onLogin]);

  /**
   * Handle customer registration
   */
  const onRegisterSubmit = useCallback(async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!authUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
      setRegisterError('Please fill in all fields');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }

    if (userMode === 'customer' && authUsername.length !== 10) {
      setRegisterError('Phone number must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      // Register as customer or staff
      const endpoint = userMode === 'customer' ? '/api/users/register-customer' : '/api/users/register';
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:5000') + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: authUsername,
          email: registerEmail,
          password: registerPassword,
          role: userMode === 'customer' ? 'customer' : 'staff'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      // Auto-login after successful registration
      const result = await onLogin(authUsername, registerPassword, userMode);
      if (result && result.error) {
        setRegisterError(result.error);
      } else {
        setIsRegistering(false);
      }
    } catch (error) {
      setRegisterError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [authUsername, registerEmail, registerPassword, registerConfirmPassword, userMode, onLogin]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  /**
   * Switch between login modes
   */
  const switchMode = useCallback((newMode) => {
    setUserMode(newMode);
    setIsRegistering(false);
    setAuthUsername('');
    setAuthPassword('');
    setAuthError('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setRegisterError('');
  }, []);

  // ==================== RENDER HELPERS ====================

  const isLoginValid = authUsername && authPassword;
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
            <h1 className="brand-name">26:07 Electronics</h1>
            <p className="brand-tagline">Premium Electronics & Smart Solutions</p>
            
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

            {/* ==================== MODE SELECTOR ==================== */}
            <div className="mode-selector">
              <button
                type="button"
                className={`mode-btn ${userMode === 'staff' ? 'active' : ''}`}
                onClick={() => switchMode('staff')}
              >
                <Icon name="users" size={16} />
                Staff Login
              </button>
              <button
                type="button"
                className={`mode-btn ${userMode === 'customer' ? 'active' : ''}`}
                onClick={() => switchMode('customer')}
              >
                <Icon name="customers" size={16} />
                Customer Login
              </button>
            </div>

            {/* ==================== STAFF LOGIN FORM ==================== */}
            {userMode === 'staff' && (
              <div className="login-content">
                <div className="login-header">
                  <h2>Welcome Back!</h2>
                  <p>Staff login</p>
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
                      onChange={(e) => setRememberMe(e.currentTarget.checked)}
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
                    disabled={loading || !authUsername || !authPassword}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                {/* Notice */}
                <div className="notice">
                  <Icon name="lock" size={14} />
                  <span>Contact your admin if you need an account</span>
                </div>
              </div>
            )}

            {/* ==================== CUSTOMER LOGIN/REGISTER FORM ==================== */}
            {userMode === 'customer' && (
              <div className="login-content">
                <div className="login-header">
                  <h2>{isRegistering ? 'Create Account' : 'Customer Login'}</h2>
                  <p>{isRegistering ? 'Join our community' : 'View your purchases and warranties'}</p>
                </div>

                {isRegistering ? (
                  /* Registration form */
                  <form onSubmit={onRegisterSubmit} className="login-form">
                    {/* Phone number field */}
                    <div className="field">
                      <label htmlFor="register-phone">
                        <Icon name="call" size={14} />
                        Phone Number
                      </label>
                      <input
                        id="register-phone"
                        type="tel"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10 digit phone number"
                        required
                        autoFocus
                        maxLength="10"
                      />
                      {authUsername.length !== 10 && authUsername && (
                        <p className="field-hint" style={{color: '#ff6b6b'}}>Phone number must be 10 digits</p>
                      )}
                    </div>

                    {/* Email field */}
                    <div className="field">
                      <label htmlFor="register-email">
                        <Icon name="mail" size={14} />
                        Email (optional)
                      </label>
                      <input
                        id="register-email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="your@email.com"
                      />
                    </div>

                    {/* Password field */}
                    <div className="field">
                      <label htmlFor="register-password">
                        <Icon name="lock" size={14} />
                        Password
                      </label>
                      <input
                        id="register-password"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>

                    {/* Confirm password field */}
                    <div className="field">
                      <label htmlFor="register-confirm">
                        <Icon name="lock" size={14} />
                        Confirm Password
                      </label>
                      <input
                        id="register-confirm"
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                      />
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
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    {/* Switch to login */}
                    <div className="form-footer">
                      <p>Already have an account?</p>
                      <button
                        type="button"
                        className="switch-link"
                        onClick={() => {
                          setIsRegistering(false);
                          setRegisterError('');
                        }}
                      >
                        Login here
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Login form */
                  <form onSubmit={onLoginSubmit} className="login-form">
                    {/* Phone number field */}
                    <div className="field">
                      <label htmlFor="customer-phone">
                        <Icon name="call" size={14} />
                        Phone Number
                      </label>
                      <input
                        id="customer-phone"
                        type="tel"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10 digit phone number"
                        required
                        autoFocus
                        maxLength="10"
                      />
                    </div>

                    {/* Password field */}
                    <div className="field">
                      <label htmlFor="customer-password">
                        <Icon name="lock" size={14} />
                        Password
                      </label>
                      <div className="password-field">
                        <input
                          id="customer-password"
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
                      disabled={loading || !authUsername || !authPassword}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </button>

                    {/* Switch to register */}
                    <div className="form-footer">
                      <p>Don't have an account?</p>
                      <button
                        type="button"
                        className="switch-link"
                        onClick={() => {
                          setIsRegistering(true);
                          setAuthError('');
                        }}
                      >
                        Create one here
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="login-footer-text">
            &copy; {currentYear} 26:07 Electronics
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
};

export default Login;
