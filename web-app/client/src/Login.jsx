/**
 * @file Login.jsx
 * @description Modern Role-Based Login Experience (Staff / Customer Selection)
 * Aligned with the commercial Slate/Indigo SaaS/Fintech ERP design system.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';
import './LoginLayout.css';

const Login = ({ onLogin, mode }) => {
  // Navigation view: null (role selector) | 'staff' | 'customer'
  const [selectedRole, setSelectedRole] = useState(() => {
    if (mode === 'staff') return 'staff';
    if (mode === 'customer') return 'customer';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/staff' || path.startsWith('/staff/')) return 'staff';
      const hash = window.location.hash.toLowerCase();
      if (hash === '#staff') return 'staff';
      if (hash === '#customer') return 'customer';
    }
    return null;
  });

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

  // Synchronize hash with role
  const selectRole = useCallback((role) => {
    setSelectedRole(role);
    setStaffError('');
    setCustomerError('');
    setRegisterError('');
    setRegisterSuccess('');
    if (typeof window !== 'undefined') {
      if (role) {
        window.location.hash = `#${role}`;
      } else {
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  }, []);

  // Listen for browser back/forward hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#staff') setSelectedRole('staff');
      else if (hash === '#customer') setSelectedRole('customer');
      else setSelectedRole(null);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load remembered staff username
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedUser');
      if (remembered) {
        setStaffUsername(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered user:', error);
    }
  }, []);

  // Save/remove remembered username
  useEffect(() => {
    try {
      if (rememberMe && staffUsername) {
        localStorage.setItem('rememberedUser', staffUsername);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedUser');
      }
    } catch (error) {
      console.error('Failed to update remembered user:', error);
    }
  }, [rememberMe, staffUsername]);

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

  return (
    <div className="ultra-login-container ultra-login-card login-container">
      {/* ============================================================
          VIEW 1: ROLE SELECTION ENTRY SCREEN (Default)
          ============================================================ */}
      {!selectedRole && (
        <div className="role-selection-wrapper">
          {/* Header & Branding */}
          <div className="role-selection-header">
            <div className="erp-brand-badge">
              <div className="erp-brand-icon">
                <Icon name="package" size={26} />
              </div>
              <div className="erp-brand-text">
                <span className="erp-brand-title">26:07 Electronics</span>
                <span className="erp-brand-subtitle">Commercial Inventory & POS ERP</span>
              </div>
            </div>

            <h1 className="role-welcome-heading">Welcome Back</h1>
            <p className="role-welcome-sub">Select how you want to continue</p>
          </div>

          {/* Role Cards Grid (Side-by-side on desktop, stacked on mobile) */}
          <div className="role-cards-grid">
            {/* STAFF / ADMIN CARD */}
            <div 
              className="role-card staff-role-card" 
              onClick={() => selectRole('staff')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectRole('staff'); }}
            >
              <div className="role-card-top">
                <div className="role-icon-box staff-icon-box">
                  <Icon name="shield" size={24} />
                </div>
                <span className="role-card-badge staff-badge">STAFF & ADMIN</span>
              </div>

              <div className="role-card-content">
                <h2 className="role-card-title">Staff / Admin</h2>
                <p className="role-card-description">
                  Manage the ERP workspace — inventory management, POS billing, warranties, EMI tracking, and financial analytics.
                </p>

                <ul className="role-features-list">
                  <li>
                    <Icon name="check" size={14} />
                    <span>Real-time inventory & stock control</span>
                  </li>
                  <li>
                    <Icon name="check" size={14} />
                    <span>Point of sale billing & EMI processing</span>
                  </li>
                  <li>
                    <Icon name="check" size={14} />
                    <span>Financial analytics & system audit</span>
                  </li>
                </ul>
              </div>

              <div className="role-card-footer">
                <button
                  type="button"
                  className="ultra-segment-btn role-select-action-btn staff-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRole('staff');
                  }}
                >
                  <span>Continue as Staff</span>
                  <span className="sr-only">Sign In STAFF</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </div>

            {/* CUSTOMER PORTAL CARD */}
            <div 
              className="role-card customer-role-card" 
              onClick={() => selectRole('customer')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectRole('customer'); }}
            >
              <div className="role-card-top">
                <div className="role-icon-box customer-icon-box">
                  <Icon name="user" size={24} />
                </div>
                <span className="role-card-badge customer-badge">CUSTOMER</span>
              </div>

              <div className="role-card-content">
                <h2 className="role-card-title">Customer Portal</h2>
                <p className="role-card-description">
                  Access your personal customer portal — view your digital invoices, track EMI repayment schedules, and check warranties.
                </p>

                <ul className="role-features-list">
                  <li>
                    <Icon name="check" size={14} />
                    <span>Verified invoices & receipt downloads</span>
                  </li>
                  <li>
                    <Icon name="check" size={14} />
                    <span>Active EMI plans & installment balance</span>
                  </li>
                  <li>
                    <Icon name="check" size={14} />
                    <span>Live product warranty coverage</span>
                  </li>
                </ul>
              </div>

              <div className="role-card-footer">
                <button
                  type="button"
                  className="ultra-segment-btn role-select-action-btn customer-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRole('customer');
                  }}
                >
                  <span>Continue as Customer</span>
                  <span className="sr-only">CUSTOMER</span>
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Security Notice */}
          <div className="role-selection-footer">
            <div className="role-security-indicator">
              <Icon name="lock" size={13} />
              <span>256-Bit SSL Encrypted Session · Strict Role-Based Data Isolation</span>
            </div>
            <p className="role-copyright">
              © {new Date().getFullYear()} 26:07 Electronics. All rights reserved.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 2: STAFF LOGIN FORM
          ============================================================ */}
      {selectedRole === 'staff' && (
        <div className="auth-form-card-wrapper">
          {/* Back button & Role Pill */}
          <div className="auth-card-top-bar">
            <button
              type="button"
              className="back-to-selection-btn"
              onClick={() => selectRole(null)}
              title="Return to role selection"
            >
              <Icon name="arrow-left" size={16} />
              <span>Back to role selection</span>
            </button>
            <span className="active-role-pill staff-pill">
              <Icon name="shield" size={13} />
              Staff Portal
            </span>
          </div>

          {/* Form Header */}
          <div className="auth-card-header">
            <div className="auth-card-icon staff-icon-bg">
              <Icon name="lock" size={24} />
            </div>
            <h2>Staff Sign In</h2>
            <p>Access the inventory management & POS workspace</p>
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

            {/* Role switch helper link */}
            <div className="auth-switch-link">
              <span>Looking for your personal invoices? </span>
              <button
                type="button"
                onClick={() => selectRole('customer')}
              >
                Go to Customer Portal →
              </button>
            </div>

            <div className="ultra-security-badge">
              <Icon name="shield" size={14} />
              <span>Secure Encrypted Staff Connection</span>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          VIEW 3: CUSTOMER PORTAL LOGIN & REGISTRATION
          ============================================================ */}
      {selectedRole === 'customer' && (
        <div className="auth-form-card-wrapper">
          {/* Back button & Role Pill */}
          <div className="auth-card-top-bar">
            <button
              type="button"
              className="back-to-selection-btn"
              onClick={() => selectRole(null)}
              title="Return to role selection"
            >
              <Icon name="arrow-left" size={16} />
              <span>Back to role selection</span>
            </button>
            <span className="active-role-pill customer-pill">
              <Icon name="user" size={13} />
              Customer Portal
            </span>
          </div>

          {/* Form Header */}
          <div className="auth-card-header">
            <div className="auth-card-icon customer-icon-bg">
              <Icon name="user" size={24} />
            </div>
            <h2>Customer Portal</h2>
            <p>Access invoices, active warranties, and EMI schedules</p>
          </div>

          {/* Sub-tabs: Login / Register */}
          <div className="ultra-sub-tabs">
            <button
              type="button"
              className={`ultra-sub-tab ${subTab === 'login' ? 'active' : ''}`}
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
              className={`ultra-sub-tab ${subTab === 'register' ? 'active' : ''}`}
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
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <Icon name="log-in" size={18} />
                    <span>Login</span>
                  </>
                )}
              </button>

              <div className="ultra-info-note">
                <Icon name="info" size={14} />
                <span>Use the email address registered during your store purchase or billing.</span>
              </div>

              {/* Role switch helper link */}
              <div className="auth-switch-link">
                <span>Are you a store manager or staff member? </span>
                <button
                  type="button"
                  onClick={() => selectRole('staff')}
                >
                  Go to Staff Login →
                </button>
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
                <span>Only customers with existing billing records can register. Use your billing email address.</span>
              </div>

              {/* Role switch helper link */}
              <div className="auth-switch-link">
                <span>Already have customer credentials? </span>
                <button
                  type="button"
                  onClick={() => setSubTab('login')}
                >
                  Switch to Login
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired
};

export default Login;
