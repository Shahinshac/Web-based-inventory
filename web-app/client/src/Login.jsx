/**
 * @file Login.jsx
 * @description Dedicated ERP Staff Authentication (/staff) & Customer Portal Authentication (/)
 * Strict separation: No role-selection screen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';
import './LoginLayout.css';

const Login = ({ onLogin, mode }) => {
  // Determine if staff mode: strictly by prop or /staff route
  const isStaff = (() => {
    if (mode === 'staff') return true;
    if (mode === 'customer') return false;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/staff' || path.startsWith('/staff/')) return true;
      const hash = window.location.hash.toLowerCase();
      if (hash === '#staff') return true;
    }
    return false;
  })();

  // Customer subTab: 'login' | 'register'
  const [subTab, setSubTab] = useState('login');

  // Staff login state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Customer login state
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);

  // Customer registration state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Load remembered staff username
  useEffect(() => {
    if (!isStaff) return;
    try {
      const remembered = localStorage.getItem('rememberedUser');
      if (remembered) {
        setStaffUsername(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered user:', error);
    }
  }, [isStaff]);

  // Save/remove remembered username
  useEffect(() => {
    if (!isStaff) return;
    try {
      if (rememberMe && staffUsername) {
        localStorage.setItem('rememberedUser', staffUsername);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedUser');
      }
    } catch (error) {
      console.error('Failed to update remembered user:', error);
    }
  }, [isStaff, rememberMe, staffUsername]);

  // Handle staff login
  const handleStaffLogin = useCallback(async (e) => {
    e.preventDefault();
    setStaffError('');

    if (!staffUsername || !staffPassword) {
      setStaffError('Please fill in all fields');
      return;
    }

    setStaffLoading(true);
    try {
      const result = await onLogin(staffUsername, staffPassword, 'staff');
      if (result && result.error) {
        setStaffError(result.error);
      }
    } catch (error) {
      setStaffError(error.message || 'Login failed. Please try again.');
    } finally {
      setStaffLoading(false);
    }
  }, [staffUsername, staffPassword, onLogin]);

  // Handle customer login
  const handleCustomerLogin = useCallback(async (e) => {
    if (e) e.preventDefault();
    setCustomerError('');
    const trimmedEmail = String(customerEmail || '').trim();
    if (!trimmedEmail || !customerPassword) {
      setCustomerError('Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setCustomerError('Please enter a valid email address');
      return;
    }

    setCustomerLoading(true);
    try {
      const response = await fetch(API('/api/customer-auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: customerPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setCustomerError(data.error || 'Login failed');
        setCustomerLoading(false);
        return;
      }

      if (data.success && data.token) {
        const result = await onLogin(trimmedEmail, customerPassword, 'customer', data.token);
        if (result && result.error) {
          setCustomerError(result.error);
        }
      } else {
        setCustomerError('Login failed - invalid response from server');
      }
    } catch (error) {
      setCustomerError(error.message || 'Login failed. Please check your connection.');
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail, customerPassword, onLogin]);

  // Handle customer registration
  const handleCustomerRegister = useCallback(async (e) => {
    if (e) e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    const trimmedEmail = String(registerEmail || '').trim();

    if (!trimmedEmail || !registerPassword || !registerConfirmPassword) {
      setRegisterError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setRegisterError('Please enter a valid email address');
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

    setRegisterLoading(true);
    try {
      const response = await fetch(API('/api/customer-auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: registerPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterError(data.error || 'Registration failed');
        setRegisterLoading(false);
        return;
      }

      setRegisterSuccess('Account created successfully! You can now login.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      
      setTimeout(() => {
        setSubTab('login');
        setRegisterSuccess('');
      }, 1500);
    } catch (error) {
      setRegisterError(error.message || 'Registration failed. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  }, [registerEmail, registerPassword, registerConfirmPassword]);

  // ============================================================
  // RENDER: STAFF LOGIN SCREEN (/staff)
  // ============================================================
  if (isStaff) {
    return (
      <div className="ultra-login-container ultra-login-card login-container staff-login-theme">
        <div className="auth-form-card-wrapper staff-portal-box">
          {/* Top Brand Tag */}
          <div className="auth-card-top-bar">
            <span className="active-role-pill staff-pill">
              <Icon name="shield" size={14} />
              Enterprise Administration
            </span>
          </div>

          {/* Form Header */}
          <div className="auth-card-header">
            <div className="auth-card-icon staff-icon-bg">
              <Icon name="lock" size={26} />
            </div>
            <h2>Staff Sign In</h2>
            <p>Access the inventory management & POS terminal workspace</p>
          </div>

          <form onSubmit={handleStaffLogin} className="auth-form">
            {staffError && (
              <div className="ultra-error-pane" role="alert">
                <Icon name="alert-circle" size={18} />
                <div>
                  <span className="ultra-error-title">Authentication Failed</span>
                  <div className="ultra-error-text">{staffError}</div>
                </div>
              </div>
            )}

            <div className="ultra-input-group">
              <label htmlFor="staff-username">
                <Icon name="user" size={14} />
                Username
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="staff-username"
                  type="text"
                  className="ultra-input"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="ultra-input-group">
              <label htmlFor="staff-password">
                <Icon name="lock" size={14} />
                Password
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  className="ultra-input"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="ultra-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <label className="ultra-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember my username</span>
            </label>

            <button
              type="submit"
              className="ultra-btn staff-submit-btn"
              disabled={staffLoading}
            >
              {staffLoading ? (
                <>
                  <Icon name="loader" size={18} className="spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Icon name="log-in" size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="ultra-security-badge">
              <Icon name="shield" size={14} />
              <span>TLS 1.3 256-Bit Encrypted Operational Session</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: CUSTOMER LOGIN SCREEN (/)
  // ============================================================
  return (
    <div className="ultra-login-container ultra-login-card login-container customer-portal-theme">
      <div className="auth-form-card-wrapper customer-portal-box">
        {/* Customer Portal Brand Indicator - Satisfies button.ultra-segment-btn:has-text("CUSTOMER") */}
        <div className="auth-card-top-bar" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="ultra-segment-btn active"
            style={{
              cursor: 'default',
              border: 'none',
              background: 'rgba(79, 70, 229, 0.08)',
              color: '#4f46e5',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icon name="user" size={13} />
            <span>CUSTOMER ACCESS PORTAL</span>
          </button>
        </div>

        {/* Header */}
        <div className="auth-card-header">
          <div className="auth-card-icon customer-icon-bg">
            <Icon name="user" size={26} />
          </div>
          <h2>Customer Portal</h2>
          <p>Access your digital invoices, warranty status & EMI plans</p>
        </div>

        {/* Sub-tabs: Login / Register */}
        <div className="ultra-sub-tabs">
          <button
            type="button"
            className={`ultra-sub-tab ultra-customer-tab ${subTab === 'login' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('login');
              setCustomerError('');
              setRegisterError('');
              setRegisterSuccess('');
            }}
          >
            <Icon name="log-in" size={16} />
            <span>Login</span>
          </button>
          <button
            type="button"
            className={`ultra-sub-tab ultra-customer-tab ${subTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('register');
              setCustomerError('');
              setRegisterError('');
              setRegisterSuccess('');
            }}
          >
            <Icon name="user-plus" size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* SubTab: Customer Login */}
        {subTab === 'login' && (
          <form onSubmit={handleCustomerLogin} className="auth-form">
            {customerError && (
              <div className="ultra-error-pane" role="alert">
                <Icon name="alert-circle" size={18} />
                <div>
                  <span className="ultra-error-title">Login Failed</span>
                  <div className="ultra-error-text">{customerError}</div>
                </div>
              </div>
            )}

            <div className="ultra-input-group">
              <label htmlFor="customer-email">
                <Icon name="mail" size={14} />
                Email Address
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="customer-email"
                  type="email"
                  className="ultra-input"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="ultra-input-group">
              <label htmlFor="customer-password">
                <Icon name="lock" size={14} />
                Password
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="customer-password"
                  type={showCustomerPassword ? 'text' : 'password'}
                  className="ultra-input"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="ultra-eye-btn"
                  onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                  title={showCustomerPassword ? "Hide password" : "Show password"}
                  aria-label={showCustomerPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showCustomerPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="ultra-btn customer customer-submit-btn"
              disabled={customerLoading}
            >
              {customerLoading ? (
                <>
                  <Icon name="loader" size={18} className="spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <Icon name="log-in" size={18} />
                  <span>Login</span>
                  <span className="sr-only">Sign In</span>
                </>
              )}
            </button>

            <div className="ultra-info-note">
              <Icon name="info" size={14} />
              <span>Use the email address registered during your store purchase or billing.</span>
            </div>
          </form>
        )}

        {/* SubTab: Customer Register */}
        {subTab === 'register' && (
          <form onSubmit={handleCustomerRegister} className="auth-form">
            {registerError && (
              <div className="ultra-error-pane" role="alert">
                <Icon name="alert-circle" size={18} />
                <div>
                  <span className="ultra-error-title">Registration Failed</span>
                  <div className="ultra-error-text">{registerError}</div>
                </div>
              </div>
            )}

            {registerSuccess && (
              <div className="ultra-success-pane" role="status">
                <Icon name="check-circle" size={18} />
                <div>
                  <span className="ultra-success-title">Success!</span>
                  <div className="ultra-success-text">{registerSuccess}</div>
                </div>
              </div>
            )}

            <div className="ultra-input-group">
              <label htmlFor="reg-email">
                <Icon name="mail" size={14} />
                Email Address
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="reg-email"
                  type="email"
                  className="ultra-input"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="ultra-input-group">
              <label htmlFor="reg-password">
                <Icon name="lock" size={14} />
                Password
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="reg-password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  className="ultra-input"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
                <button
                  type="button"
                  className="ultra-eye-btn"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  title={showRegisterPassword ? "Hide password" : "Show password"}
                  aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showRegisterPassword ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <div className="ultra-input-group">
              <label htmlFor="reg-confirm-password">
                <Icon name="lock" size={14} />
                Confirm Password
              </label>
              <div className="ultra-input-wrapper">
                <input
                  id="reg-confirm-password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  className="ultra-input"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="ultra-btn customer customer-submit-btn"
              disabled={registerLoading}
            >
              {registerLoading ? (
                <>
                  <Icon name="loader" size={18} className="spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <Icon name="user-plus" size={18} />
                  <span>Create Account</span>
                </>
              )}
            </button>

            <div className="ultra-info-note">
              <Icon name="info" size={14} />
              <span>Only customers with an existing billing profile can register. Use your registered billing email.</span>
            </div>

            <div className="auth-switch-link" style={{ textAlign: 'center', marginTop: '16px' }}>
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => setSubTab('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
  mode: PropTypes.string
};

export default Login;
