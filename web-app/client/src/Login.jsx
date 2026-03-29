/**
 * @file Login.jsx
 * @description Professional full-screen authentication - Staff & Customer Login
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
      setStaffError(error.message || 'Login failed. Please try again.');
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
    try {
      const response = await fetch(API('/api/users/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, type: 'login' })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send OTP');
      }

      setOtpStep('otp');
      setOtpTimer(300); // 5 minutes
    } catch (error) {
      setCustomerError(error.message || 'Failed to send OTP. Please try again.');
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
        throw new Error(err.error || 'Invalid OTP');
      }

      const data = await response.json();
      const result = await onLogin(customerEmail, null, 'customer', data.token);
      if (result && result.error) {
        setCustomerError(result.error);
      }
    } catch (error) {
      setCustomerError(error.message || 'OTP verification failed. Please try again.');
    } finally {
      setCustomerLoading(false);
    }
  }, [customerEmail, customerOtp, onLogin]);

  const currentYear = new Date().getFullYear();

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: 'white'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚡</div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px'
          }}>26:07 Electronics</h1>
          <p style={{
            fontSize: '15px',
            opacity: 0.95,
            margin: '0',
            fontWeight: '500'
          }}>Smart Inventory & POS Management</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          marginBottom: '24px'
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
            padding: '8px'
          }}>
            <button
              type="button"
              onClick={() => {
                setMode('staff');
                setCustomerError('');
                setStaffError('');
              }}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: mode === 'staff' ? 'white' : 'transparent',
                color: mode === 'staff' ? '#6366f1' : '#64748b',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '4px',
                boxShadow: mode === 'staff' ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none'
              }}
            >
              <Icon name="lock" size={18} />
              Staff Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('customer');
                setCustomerError('');
                setStaffError('');
                setOtpStep('email');
                setOtpTimer(0);
              }}
              style={{
                flex: 1,
                padding: '16px 20px',
                background: mode === 'customer' ? 'white' : 'transparent',
                color: mode === 'customer' ? '#6366f1' : '#64748b',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '4px',
                boxShadow: mode === 'customer' ? '0 2px 8px rgba(99, 102, 241, 0.1)' : 'none'
              }}
            >
              <Icon name="mail" size={18} />
              Customer Login
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '40px' }}>
            {/* Staff Login */}
            {mode === 'staff' && (
              <form onSubmit={handleStaffLogin}>
                <h2 style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  margin: '0 0 8px 0',
                  color: '#0f172a'
                }}>Welcome Back</h2>
                <p style={{
                  margin: '0 0 32px 0',
                  color: '#64748b',
                  fontSize: '15px'
                }}>Sign in to your staff account</p>

                {/* Username */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                    marginBottom: '8px'
                  }}>Username</label>
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#0f172a',
                    marginBottom: '8px'
                  }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        paddingRight: '44px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Icon name={showPassword ? "lock" : "eye"} size={20} />
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  color: '#475569'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  Remember me
                </label>

                {/* Error */}
                {staffError && (
                  <div style={{
                    padding: '14px 16px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '12px',
                    color: '#991b1b',
                    fontSize: '14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Icon name="alert-circle" size={18} />
                    {staffError}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={staffLoading}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    background: staffLoading ? '#94a3b8' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: staffLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.5px'
                  }}
                  onMouseOver={(e) => !staffLoading && (e.target.style.background = '#4f46e5')}
                  onMouseOut={(e) => !staffLoading && (e.target.style.background = '#6366f1')}
                >
                  {staffLoading ? '🔄 Signing in...' : '🔓 Sign In'}
                </button>

                {/* Help */}
                <div style={{
                  marginTop: '20px',
                  padding: '14px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Icon name="lock" size={18} />
                  <span>Contact your administrator if you need an account</span>
                </div>
              </form>
            )}

            {/* Customer Login */}
            {mode === 'customer' && (
              <form onSubmit={otpStep === 'email' ? handleSendOtp : handleVerifyOtp}>
                <h2 style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  margin: '0 0 8px 0',
                  color: '#0f172a'
                }}>Customer Login</h2>
                <p style={{
                  margin: '0 0 32px 0',
                  color: '#64748b',
                  fontSize: '15px'
                }}>Secure OTP-based authentication</p>

                {otpStep === 'email' ? (
                  <>
                    {/* Email */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0f172a',
                        marginBottom: '8px'
                      }}>Email Address</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    {/* Info */}
                    <div style={{
                      padding: '14px 16px',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '12px',
                      color: '#0c4a6e',
                      fontSize: '14px',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <Icon name="shield" size={18} />
                      <span>We'll send a 6-digit OTP to your email</span>
                    </div>

                    {/* Error */}
                    {customerError && (
                      <div style={{
                        padding: '14px 16px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '12px',
                        color: '#991b1b',
                        fontSize: '14px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <Icon name="alert-circle" size={18} />
                        {customerError}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={customerLoading}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: customerLoading ? '#94a3b8' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: customerLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        letterSpacing: '0.5px'
                      }}
                      onMouseOver={(e) => !customerLoading && (e.target.style.background = '#4f46e5')}
                      onMouseOut={(e) => !customerLoading && (e.target.style.background = '#6366f1')}
                    >
                      {customerLoading ? '📧 Sending OTP...' : '📧 Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* OTP Input */}
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0f172a',
                        marginBottom: '8px'
                      }}>One-Time Password</label>
                      <input
                        type="text"
                        value={customerOtp}
                        onChange={(e) => setCustomerOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength="6"
                        required
                        autoFocus
                        inputMode="numeric"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '20px',
                          fontFamily: 'monospace',
                          letterSpacing: '4px',
                          fontWeight: '600',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s',
                          outline: 'none',
                          textAlign: 'center'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>

                    {/* Timer */}
                    {otpTimer > 0 && (
                      <div style={{
                        padding: '12px 16px',
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        borderRadius: '12px',
                        color: '#92400e',
                        fontSize: '14px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        fontWeight: '600'
                      }}>
                        ⏱️ OTP expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                      </div>
                    )}

                    {/* Error */}
                    {customerError && (
                      <div style={{
                        padding: '14px 16px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '12px',
                        color: '#991b1b',
                        fontSize: '14px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <Icon name="alert-circle" size={18} />
                        {customerError}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={customerLoading || customerOtp.length !== 6}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        background: (customerLoading || customerOtp.length !== 6) ? '#94a3b8' : '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: (customerLoading || customerOtp.length !== 6) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        letterSpacing: '0.5px'
                      }}
                      onMouseOver={(e) => (customerLoading || customerOtp.length !== 6) || (e.target.style.background = '#4f46e5')}
                      onMouseOut={(e) => (customerLoading || customerOtp.length !== 6) || (e.target.style.background = '#6366f1')}
                    >
                      {customerLoading ? '🔄 Verifying...' : '✅ Verify & Login'}
                    </button>

                    {/* Back */}
                    <button
                      type="button"
                      onClick={() => { setOtpStep('email'); setCustomerOtp(''); setCustomerError(''); }}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '12px 24px',
                        background: 'transparent',
                        color: '#6366f1',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.borderColor = '#6366f1'}
                      onMouseOut={(e) => e.target.style.borderColor = '#e2e8f0'}
                    >
                      ← Use different email
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          © {currentYear} 26:07 Electronics · Secure & Reliable
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;
