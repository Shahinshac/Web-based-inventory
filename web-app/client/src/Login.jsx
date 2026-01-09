/**
 * @file Login.jsx
 * @description Authentication component with login and registration
 * Provides secure user authentication with form validation and error handling
 * 
 * @author 26:07 Electronics
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';

/**
 * Login Component
 * 
 * Handles user authentication with:
 * - Login form with username/password
 * - Registration form with username/email/password
 * - Remember me functionality
 * - Password visibility toggle
 * - Form validation
 * - Loading states
 * - Error display
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.showLoginPage - Current tab (true = login, false = register)
 * @param {Function} props.setShowLoginPage - Toggle between login/register
 * @param {string} props.authUsername - Login username value
 * @param {Function} props.setAuthUsername - Update login username
 * @param {string} props.authPassword - Login password value
 * @param {Function} props.setAuthPassword - Update login password
 * @param {string} props.authError - Login error message
 * @param {Function} props.handleAuth - Login handler
 * @param {string} props.registerUsername - Registration username value
 * @param {Function} props.setRegisterUsername - Update registration username
 * @param {string} props.registerPassword - Registration password value
 * @param {Function} props.setRegisterPassword - Update registration password
 * @param {string} props.registerEmail - Registration email value
 * @param {Function} props.setRegisterEmail - Update registration email
 * @param {Function} props.handleRegister - Registration handler
 * @param {string} props.registerError - Registration error message
 * @returns {React.Element} Login page component
 */
const Login = ({
  showLoginPage,
  setShowLoginPage,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authError,
  handleAuth,
  registerUsername,
  setRegisterUsername,
  registerPassword,
  setRegisterPassword,
  registerEmail,
  setRegisterEmail,
  handleRegister,
  registerError,
}) => {
  // ==================== STATE ====================
  
  /** @type {[boolean, Function]} Loading state for form submission */
  const [loading, setLoading] = useState(false);
  
  /** @type {[boolean, Function]} Password visibility toggle */
  const [showPassword, setShowPassword] = useState(false);
  
  /** @type {[boolean, Function]} Remember me checkbox state */
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
  }, [setAuthUsername]);

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
   * @param {React.FormEvent} e - Form event
   */
  const onLoginSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!authUsername || !authPassword) {
      return;
    }
    
    setLoading(true);
    try {
      await handleAuth();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  }, [authUsername, authPassword, handleAuth]);

  /**
   * Handle registration form submission
   * @param {React.FormEvent} e - Form event
   */
  const onRegisterSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!registerUsername || !registerEmail || !registerPassword) {
      return;
    }
    
    setLoading(true);
    try {
      await handleRegister();
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  }, [registerUsername, registerEmail, registerPassword, handleRegister]);

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  /**
   * Switch to login tab
   */
  const switchToLogin = useCallback(() => {
    setShowLoginPage(true);
  }, [setShowLoginPage]);

  /**
   * Switch to register tab
   */
  const switchToRegister = useCallback(() => {
    setShowLoginPage(false);
  }, [setShowLoginPage]);

  // ==================== RENDER HELPERS ====================

  /**
   * Check if login form is valid
   * @returns {boolean}
   */
  const isLoginValid = authUsername && authPassword;

  /**
   * Check if registration form is valid
   * @returns {boolean}
   */
  const isRegisterValid = registerUsername && registerEmail && registerPassword && registerPassword.length >= 6;

  /**
   * Get current year for footer
   * @returns {number}
   */
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
            
            {/* Tab Navigation */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${showLoginPage ? 'active' : ''}`}
                onClick={switchToLogin}
                aria-label="Switch to login"
              >
                <Icon name="lock" size={16} />
                Login
              </button>
              <button
                type="button"
                className={`login-tab ${!showLoginPage ? 'active' : ''}`}
                onClick={switchToRegister}
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
  showLoginPage: PropTypes.bool.isRequired,
  setShowLoginPage: PropTypes.func.isRequired,
  authUsername: PropTypes.string.isRequired,
  setAuthUsername: PropTypes.func.isRequired,
  authPassword: PropTypes.string.isRequired,
  setAuthPassword: PropTypes.func.isRequired,
  authError: PropTypes.string,
  handleAuth: PropTypes.func.isRequired,
  registerUsername: PropTypes.string.isRequired,
  setRegisterUsername: PropTypes.func.isRequired,
  registerPassword: PropTypes.string.isRequired,
  setRegisterPassword: PropTypes.func.isRequired,
  registerEmail: PropTypes.string.isRequired,
  setRegisterEmail: PropTypes.func.isRequired,
  handleRegister: PropTypes.func.isRequired,
  registerError: PropTypes.string,
};

Login.defaultProps = {
  authError: '',
  registerError: '',
};

export default Login;
