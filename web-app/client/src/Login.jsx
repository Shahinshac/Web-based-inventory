/**
 * @file Login.jsx
 * @description Ultra-Premium Login Experience with Blue Gradient Left Panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';
import './LoginLayout.css';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff'); // 'staff' or 'customer'
  const [subTab, setSubTab] = useState('login'); // 'login' or 'register'

  // Staff login
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Customer login
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);

  // Customer registration
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

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

  // Handle customer login - FIXED to use correct API
  const handleCustomerLogin = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerEmail || !customerPassword) {
      setCustomerError('Please enter both email and password');
      return;
    }

    setCustomerLoading(true);
    try {
      // Call the correct customer auth endpoint
      const response = await fetch(API('/api/customer-auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
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
        // Pass the token to onLogin for proper auth state management
        const result = await onLogin(customerEmail, customerPassword, 'customer', data.token);
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
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerEmail || !registerPassword || !registerConfirmPassword) {
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

    setRegisterLoading(true);
    try {
      const response = await fetch(API('/api/customer-auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerEmail,
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
      
      // Switch to login tab after 2 seconds
      setTimeout(() => {
        setSubTab('login');
        setRegisterSuccess('');
      }, 2000);
    } catch (error) {
      setRegisterError(error.message || 'Registration failed. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  }, [registerEmail, registerPassword, registerConfirmPassword]);

  return (
    <div className="ultra-login-container">
      {/* Left Side - Brand Panel with Blue Gradient */}
      <div className="ultra-brand-side">
        <div className="grid-overlay"></div>
        
        <div className="ultra-brand-content">
          <div className="ultra-logo-box">
            <Icon name="zap" size={40} />
          </div>
          
          <h1 className="ultra-brand-title">26:07 Electronics</h1>
          <p className="ultra-brand-subtitle">
            Smart Inventory & POS Management System with seamless customer portal integration
          </p>
          
          <div className="ultra-features">
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon">
                <Icon name="check" size={18} />
              </div>
              <span>Real-time inventory tracking</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon">
                <Icon name="check" size={18} />
              </div>
              <span>Secure authentication & role-based access</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon">
                <Icon name="check" size={18} />
              </div>
              <span>Customer portal with warranty tracking</span>
            </div>
          </div>
          
          <div className="ultra-trust-row">
            <div className="ultra-trust-badge">
              <Icon name="shield" size={12} />
              <span>256-BIT SSL</span>
            </div>
            <div className="ultra-trust-badge">
              <Icon name="lock" size={12} />
              <span>SECURE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="ultra-form-side">
        <div className="ultra-form-wrapper">
          {/* Segment Control - Staff / Customer */}
          <div className="ultra-segment-control">
            <div className={`ultra-segment-indicator ${mode === 'customer' ? 'ultra-segment-customer' : ''}`}></div>
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setMode('staff');
                setStaffError('');
                setCustomerError('');
                setRegisterError('');
                setRegisterSuccess('');
              }}
            >
              <Icon name="lock" size={16} />
              STAFF
            </button>
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => {
                setMode('customer');
                setStaffError('');
                setCustomerError('');
                setRegisterError('');
                setRegisterSuccess('');
              }}
            >
              <Icon name="user" size={16} />
              CUSTOMER
            </button>
          </div>

          {/* STAFF LOGIN */}
          {mode === 'staff' && (
            <>
              <div className="ultra-form-header">
                <h2>Staff Login</h2>
                <p>Access the inventory management system</p>
              </div>

              <form onSubmit={handleStaffLogin}>
                {staffError && (
                  <div className="ultra-error-pane">
                    <Icon name="alert-circle" size={18} />
                    <div>
                      <span className="ultra-error-title">Login Failed</span>
                      <div className="ultra-error-text">{staffError}</div>
                    </div>
                  </div>
                )}

                <div className="ultra-input-group">
                  <label>
                    <Icon name="user" size={14} />
                    Username
                  </label>
                  <div className="ultra-input-wrapper">
                    <input
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
                  <label>
                    <Icon name="lock" size={14} />
                    Password
                  </label>
                  <div className="ultra-input-wrapper">
                    <input
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
                  className="ultra-btn"
                  disabled={staffLoading}
                >
                  {staffLoading ? (
                    <>
                      <Icon name="loader" size={18} className="spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Icon name="log-in" size={18} />
                      Sign In
                    </>
                  )}
                </button>

                <div className="ultra-security-badge">
                  <Icon name="shield" size={14} />
                  Secure Encrypted Connection
                </div>
              </form>
            </>
          )}

          {/* CUSTOMER LOGIN/REGISTER */}
          {mode === 'customer' && (
            <>
              <div className="ultra-form-header">
                <h2>Customer Portal</h2>
                <p>Access your invoices, warranties, and EMI details</p>
              </div>

              {/* Sub-tabs for Login / Register */}
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
                  Login
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
                  Register
                </button>
              </div>

              {/* Customer Login Form */}
              {subTab === 'login' && (
                <form onSubmit={handleCustomerLogin}>
                  {customerError && (
                    <div className="ultra-error-pane">
                      <Icon name="alert-circle" size={18} />
                      <div>
                        <span className="ultra-error-title">Login Failed</span>
                        <div className="ultra-error-text">{customerError}</div>
                      </div>
                    </div>
                  )}

                  <div className="ultra-input-group">
                    <label>
                      <Icon name="mail" size={14} />
                      Email Address
                    </label>
                    <div className="ultra-input-wrapper">
                      <input
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
                    <label>
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="ultra-input-wrapper">
                      <input
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
                      >
                        <Icon name={showCustomerPassword ? 'eye-off' : 'eye'} size={18} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="ultra-btn customer"
                    disabled={customerLoading}
                  >
                    {customerLoading ? (
                      <>
                        <Icon name="loader" size={18} className="spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Icon name="log-in" size={18} />
                        Login
                      </>
                    )}
                  </button>

                  <div className="ultra-info-note">
                    <Icon name="info" size={14} />
                    <span>Use the email address you provided during billing to access your account.</span>
                  </div>
                </form>
              )}

              {/* Customer Register Form */}
              {subTab === 'register' && (
                <form onSubmit={handleCustomerRegister}>
                  {registerError && (
                    <div className="ultra-error-pane">
                      <Icon name="alert-circle" size={18} />
                      <div>
                        <span className="ultra-error-title">Registration Failed</span>
                        <div className="ultra-error-text">{registerError}</div>
                      </div>
                    </div>
                  )}

                  {registerSuccess && (
                    <div className="ultra-success-pane">
                      <Icon name="check-circle" size={18} />
                      <div>
                        <span className="ultra-success-title">Success!</span>
                        <div className="ultra-success-text">{registerSuccess}</div>
                      </div>
                    </div>
                  )}

                  <div className="ultra-input-group">
                    <label>
                      <Icon name="mail" size={14} />
                      Email Address
                    </label>
                    <div className="ultra-input-wrapper">
                      <input
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
                    <label>
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="ultra-input-wrapper">
                      <input
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
                      >
                        <Icon name={showRegisterPassword ? 'eye-off' : 'eye'} size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="ultra-input-group">
                    <label>
                      <Icon name="lock" size={14} />
                      Confirm Password
                    </label>
                    <div className="ultra-input-wrapper">
                      <input
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
                    className="ultra-btn customer"
                    disabled={registerLoading}
                  >
                    {registerLoading ? (
                      <>
                        <Icon name="loader" size={18} className="spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <Icon name="user-plus" size={18} />
                        Create Account
                      </>
                    )}
                  </button>

                  <div className="ultra-info-note">
                    <Icon name="info" size={14} />
                    <span>Only customers with existing billing records can register. Use your billing email address.</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <div className="ultra-footer">
          © {new Date().getFullYear()} 26:07 Electronics. All rights reserved.
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired
};

export default Login;
