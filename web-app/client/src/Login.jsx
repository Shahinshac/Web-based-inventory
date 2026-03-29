/**
 * @file Login.jsx
 * @description Professional split-screen authentication - Staff & Customer Login
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff'); // 'staff' or 'customer'

  // Staff login
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Customer login - OTP based
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerOtp, setCustomerOtp] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [otpStep, setOtpStep] = useState('email'); // 'email' or 'otp'
  const [otpTimer, setOtpTimer] = useState(0);

  // Connection status (for visual feedback)
  const [connStatus, setConnStatus] = useState('online'); // online, offline, waking

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

  // OTP Timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpTimer]);

  // Handle staff login
  const handleStaffLogin = useCallback(async (e) => {
    e.preventDefault();
    setStaffError('');

    if (!staffUsername || !staffPassword) {
      setStaffError('Please enter both username and password');
      return;
    }

    setStaffLoading(true);
    try {
      const result = await onLogin(staffUsername, staffPassword, 'staff');
      if (result && result.error) {
        setStaffError(result.error);
      }
    } catch (error) {
      setStaffError(error.message || 'Login failed. Please verify your credentials.');
    } finally {
      setStaffLoading(false);
    }
  }, [staffUsername, staffPassword, onLogin]);

  // Handle send OTP
  const handleSendOtp = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerEmail) {
      setCustomerError('Please enter your email');
      return;
    }

    setCustomerLoading(true);
    setConnStatus('online'); // Reset status at start of attempt
    
    try {
      const apiUrl = API('/api/users/send-otp');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, type: 'login' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      setOtpStep('otp');
      setOtpTimer(300); // 5 minutes
    } catch (error) {
      console.error('OTP Send Error:', error);
      let errorMsg = error.message || 'Failed to send OTP';

      if (error.name === 'AbortError') {
        errorMsg = 'Request timed out. The server might be waking up. Please try again.';
        setConnStatus('waking');
      } else if (error instanceof TypeError) {
        errorMsg = 'Cannot connect to server. Check your internet connection.';
        setConnStatus('offline');
      }

      setCustomerError(errorMsg);
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail]);

  // Handle verify OTP
  const handleVerifyOtp = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerOtp || customerOtp.length !== 6) {
      setCustomerError('Please enter a valid 6-digit OTP');
      return;
    }

    setCustomerLoading(true);
    try {
      const response = await fetch(API('/api/users/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, otp: customerOtp })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Invalid OTP. Please check and try again.');
      }

      const data = await response.json();
      const result = await onLogin(customerEmail, null, 'customer', data.token);
      if (result && result.error) {
        setCustomerError(result.error);
      }
    } catch (error) {
      setCustomerError(error.message || 'OTP verification failed.');
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail, customerOtp, onLogin]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Left Side: Branding & Info */}
        <div className="login-brand-side">
          <div className="brand-inner">
            <div className="brand-logo-box" style={{ width: '100px', height: '100px', marginBottom: '40px' }}>
              <Icon name="zap" size={50} />
            </div>
            <h1 className="brand-name" style={{ fontSize: '42px', marginBottom: '20px' }}>26:07 Electronics</h1>
            <p className="brand-tagline" style={{ fontSize: '18px', maxWidth: '450px', marginBottom: '60px' }}>
              Advanced Inventory & POS Management System. 
              Efficiency and reliability at your fingertips.
            </p>
            
            <div className="brand-list" style={{ gap: '24px' }}>
              <div className="brand-list-item" style={{ padding: '18px 24px', fontSize: '17px' }}>
                <Icon name="check-circle" size={20} />
                <span>Real-time Inventory Tracking</span>
              </div>
              <div className="brand-list-item" style={{ padding: '18px 24px', fontSize: '17px' }}>
                <Icon name="check-circle" size={20} />
                <span>Secure Cloud-Based Storage</span>
              </div>
              <div className="brand-list-item" style={{ padding: '18px 24px', fontSize: '17px' }}>
                <Icon name="check-circle" size={20} />
                <span>Automated Financial Reporting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Forms */}
        <div className="login-form-side">
          {/* Connection Status Indicator */}
          <div className={`conn-status-bar ${connStatus}`}>
            <Icon name={connStatus === 'online' ? 'activity' : connStatus === 'offline' ? 'wifi-off' : 'clock'} size={14} />
            <span>{connStatus === 'online' ? 'System Online' : connStatus === 'offline' ? 'No Connection' : 'Checking Status...'}</span>
          </div>

          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => { setMode('staff'); setStaffError(''); setCustomerError(''); }}
            >
              <Icon name="shield" size={16} />
              Staff Login
            </button>
            <button 
              className={`mode-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => { setMode('customer'); setStaffError(''); setCustomerError(''); setOtpStep('email'); }}
            >
              <Icon name="users" size={16} />
              Customer
            </button>
          </div>

          <div className="login-content">
            {mode === 'staff' ? (
              /* Staff Login Form */
              <div className="staff-portal">
                <div className="login-header" style={{ marginBottom: '40px', maxWidth: '450px' }}>
                  <div className="portal-badge" style={{ padding: '6px 16px', fontSize: '12px' }}>STAFF PORTAL</div>
                  <h2 style={{ fontSize: '36px', marginTop: '16px' }}>Welcome Back</h2>
                  <p style={{ fontSize: '16px' }}>Please sign in to access the management dashboard.</p>
                </div>

                <form className="login-form" onSubmit={handleStaffLogin} style={{ maxWidth: '450px' }}>
                  <div className="field">
                    <label>
                      <Icon name="user" size={14} />
                      Username
                    </label>
                    <input 
                      type="text" 
                      placeholder="your username" 
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="field">
                    <label>
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="password-field">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        required 
                      />
                      <button 
                        type="button" 
                        className="eye-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                      </button>
                    </div>
                  </div>

                  <label className="remember-me">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me on this device</span>
                  </label>

                  {staffError && (
                    <div className="error-notice">
                      <Icon name="alert-circle" size={16} />
                      {staffError}
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={staffLoading}>
                    {staffLoading ? 'Logging In...' : 'Access Dashboard'}
                  </button>
                </form>

                <div className="login-form-extras">
                  <button type="button" className="forgot-password" onClick={() => setStaffError('Contact admin to reset password')}>
                    Forgot Password?
                  </button>
                  <div className="notice">
                    <Icon name="info" size={14} />
                    <span>Authorized staff members only. 26:07 Electronics Secure Access.</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Customer Login Form */
              <div className="customer-portal">
                <div className="login-header" style={{ marginBottom: '40px', maxWidth: '450px' }}>
                  <div className="portal-badge" style={{ padding: '6px 16px', fontSize: '12px' }}>CUSTOMER PORTAL</div>
                  <h2 style={{ fontSize: '36px', marginTop: '16px' }}>Hello!</h2>
                  <p style={{ fontSize: '16px' }}>Sign in with your email to view your orders and invoices.</p>
                </div>

                <form className="login-form" onSubmit={otpStep === 'email' ? handleSendOtp : handleVerifyOtp} style={{ maxWidth: '450px' }}>
                  {otpStep === 'email' ? (
                    /* Step 1: Email */
                    <>
                      <div className="field">
                        <label>
                          <Icon name="mail" size={14} />
                          Email Address
                        </label>
                        <input 
                          type="email" 
                          placeholder="name@email.com" 
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          required 
                        />
                      </div>
                      
                      {customerError && (
                        <div className="error-notice">
                          <Icon name="alert-circle" size={16} />
                          {customerError}
                        </div>
                      )}

                      <button type="submit" className="submit-btn" disabled={customerLoading}>
                        {customerLoading ? 'Sending...' : 'Receive OTP'}
                      </button>
                    </>
                  ) : (
                    /* Step 2: OTP */
                    <>
                      <div className="field">
                        <label>
                          <Icon name="shield-check" size={14} />
                          Verification Code
                        </label>
                        <input 
                          type="text" 
                          placeholder="000 000" 
                          maxLength="6"
                          value={customerOtp}
                          onChange={(e) => setCustomerOtp(e.target.value.replace(/\D/g, ''))}
                          style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
                          required 
                        />
                      </div>

                      {otpTimer > 0 && (
                        <div className="notice">
                          <Icon name="clock" size={14} />
                          Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                        </div>
                      )}

                      {customerError && (
                        <div className="error-notice">
                          <Icon name="alert-circle" size={16} />
                          {customerError}
                        </div>
                      )}

                      <button type="submit" className="submit-btn" disabled={customerLoading || customerOtp.length < 6}>
                        {customerLoading ? 'Verifying...' : 'Verify & Sign In'}
                      </button>
                      
                      <button 
                        type="button" 
                        className="forgot-password" 
                        style={{ marginTop: '16px', textDecoration: 'none' }}
                        onClick={() => { setOtpStep('email'); setCustomerOtp(''); }}
                      >
                        ← Use different email
                      </button>
                    </>
                  )}
                </form>
              </div>
            )}
          </div>

          <div className="login-footer-text">
            © {currentYear} 26:07 Electronics Inc. All Rights Reserved.
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
