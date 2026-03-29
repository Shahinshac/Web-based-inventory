/**
 * @file Login.jsx
 * @description Professional full-screen authentication - Resolved Tab Visibility
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API, apiPost } from './utils/api.js';
import { useOffline } from './hooks/useOffline.js';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff'); // 'staff' or 'customer'
  const { connectionStatus: connStatus } = useOffline(false);

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
      setStaffError(error.message || 'Login failed.');
    } finally {
      setStaffLoading(false);
    }
  }, [staffUsername, staffPassword, onLogin]);

  // Handle send OTP
  const handleSendOtp = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerEmail) {
      setCustomerError('Email is required');
      return;
    }

    setCustomerLoading(true);
    try {
      await apiPost('/api/users/send-otp', { email: customerEmail, type: 'login' });
      setOtpStep('otp');
      setOtpTimer(300);
    } catch (error) {
      setCustomerError(error.message || 'Connection error.');
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail]);

  // Handle verify OTP
  const handleVerifyOtp = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerOtp || customerOtp.length !== 6) {
      setCustomerError('Enter 6-digit code');
      return;
    }

    setCustomerLoading(true);
    try {
      const data = await apiPost('/api/users/verify-otp', { email: customerEmail, otp: customerOtp });
      const result = await onLogin(customerEmail, null, 'customer', data.token);
      if (result && result.error) {
        setCustomerError(result.error);
      }
    } catch (error) {
      setCustomerError(error.message || 'Verification failed.');
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail, customerOtp, onLogin]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Left Side: Branding & Info (Modern Charcoal Theme) */}
        <div className="login-brand-side">
          <div className="brand-inner">
            <div className="brand-logo-box">
              <Icon name="zap" size={40} />
            </div>
            <h1 className="brand-name">26:07 Electronics</h1>
            <p className="brand-tagline">
              Advanced Inventory & POS Management System. 
              Efficiency and reliability at your fingertips.
            </p>
            
            <div className="brand-list">
              <div className="brand-list-item">
                <Icon name="check-circle" size={18} />
                <span>Real-time Inventory Tracking</span>
              </div>
              <div className="brand-list-item">
                <Icon name="check-circle" size={18} />
                <span>Secure Cloud-Based Storage</span>
              </div>
              <div className="brand-list-item">
                <Icon name="check-circle" size={18} />
                <span>Automated Financial Reporting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Centered Forms */}
        <div className="login-form-side">
          <div className="login-form-container" style={{ width: '100%', maxWidth: '480px', padding: '0 40px', margin: '0 auto' }}>
            
            <div className={`conn-status-bar ${connStatus}`} style={{ marginBottom: '32px' }}>
              <Icon name={connStatus === 'online' ? 'activity' : connStatus === 'offline' ? 'wifi-off' : 'clock'} size={14} />
              <span>{connStatus === 'online' ? 'System Online' : 'Check Network'}</span>
            </div>

            {/* Prominent Tab Toggles */}
            <div className="mode-selector" style={{ marginBottom: '48px', background: '#f1f5f9', padding: '10px', borderRadius: '18px' }}>
              <button 
                type="button"
                className={`mode-btn ${mode === 'staff' ? 'active' : ''}`}
                onClick={() => { setMode('staff'); setStaffError(''); setCustomerError(''); }}
                style={{ flex: 1, minWidth: '150px', padding: '14px 20px' }}
              >
                <Icon name="shield" size={14} />
                <span style={{ fontWeight: 800 }}>STAFF</span>
              </button>
              <button 
                type="button"
                className={`mode-btn ${mode === 'customer' ? 'active' : ''}`}
                onClick={() => { setMode('customer'); setStaffError(''); setCustomerError(''); setOtpStep('email'); }}
                style={{ flex: 1, minWidth: '150px', padding: '14px 20px' }}
              >
                <Icon name="users" size={14} />
                <span style={{ fontWeight: 800 }}>CUSTOMER</span>
              </button>
            </div>

            <div className="login-content" style={{ maxWidth: '100%' }}>
              {mode === 'staff' ? (
                <div className="staff-portal">
                  <div className="login-header">
                    <div className="portal-badge">STAFF AUTHENTICATION</div>
                    <h2>Welcome Back</h2>
                    <p>Enter your credentials to access the console.</p>
                  </div>

                  <form className="login-form" onSubmit={handleStaffLogin}>
                    <div className="field">
                      <label><Icon name="user" size={14} /> Username</label>
                      <input 
                        type="text" 
                        placeholder="username" 
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        required 
                      />
                    </div>
                    
                    <div className="field">
                      <label><Icon name="lock" size={14} /> Password</label>
                      <div className="password-field">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          required 
                        />
                        <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                        </button>
                      </div>
                    </div>

                    <label className="remember-me">
                      <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                      <span>Remember access</span>
                    </label>

                    {staffError && <div className="error-notice"><Icon name="alert-circle" size={16} /> {staffError}</div>}

                    <button type="submit" className="submit-btn" disabled={staffLoading}>
                      {staffLoading ? 'Verifying...' : 'Sign In'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="customer-portal">
                  <div className="login-header">
                    <div className="portal-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>SECURE ACCESS</div>
                    <h2>Customer Log In</h2>
                    <p>We'll send a secure code to your email address.</p>
                  </div>

                  <div className="stepper" style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: otpStep === 'email' ? '#4f46e5' : '#10b981' }}></div>
                    <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: otpStep === 'otp' ? '#4f46e5' : '#ced4da' }}></div>
                  </div>

                  <form className="login-form" onSubmit={otpStep === 'email' ? handleSendOtp : handleVerifyOtp}>
                    {otpStep === 'email' ? (
                      <>
                        <div className="field">
                          <label><Icon name="mail" size={14} /> Email Address</label>
                          <input type="email" placeholder="email@address.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                        </div>
                        {customerError && <div className="error-notice">{customerError}</div>}
                        <button type="submit" className="submit-btn" disabled={customerLoading}>Receive Code</button>
                      </>
                    ) : (
                      <>
                        <div className="field">
                          <label><Icon name="shield-check" size={14} /> 6-Digit Code</label>
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
                        {otpTimer > 0 && <div className="notice">Code expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}</div>}
                        {customerError && <div className="error-notice">{customerError}</div>}
                        <button type="submit" className="submit-btn" disabled={customerLoading || customerOtp.length < 6}>Authenticate</button>
                        <button type="button" className="forgot-password" style={{ marginTop: '16px', background: 'none', border: 'none' }} onClick={() => setOtpStep('email')}>← Re-enter email</button>
                      </>
                    )}
                  </form>
                  
                  <div className="security-badge" style={{ 
                    display: 'flex', alignItems: 'center', gap: '10px', marginTop: '48px',
                    fontSize: '12px', color: '#10b981', fontWeight: '800', 
                    background: 'rgba(16, 185, 129, 0.05)', padding: '14px 24px', 
                    borderRadius: '100px', border: '1px solid rgba(16, 185, 129, 0.1)',
                    letterSpacing: '0.5px'
                  }}>
                    <Icon name="shield" size={14} />
                    <span>SECURE ENCRYPTED VERIFICATION</span>
                  </div>
                </div>
              )}
            </div>

            <div className="login-footer-text" style={{ marginTop: '60px', opacity: 0.5 }}>
              © {currentYear} 26:07 Electronics Inc.
            </div>
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
