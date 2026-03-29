import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { apiPost } from './utils/api.js';
import { useOffline } from './hooks/useOffline.js';
import './LoginLayout.css'; // Import the new ultra-modern stylesheet

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

  const renderError = (errorMsg) => {
    if (!errorMsg) return null;
    const isNetwork = errorMsg.includes('backend is running');
    return (
      <div className="ultra-error-pane">
        <Icon name={isNetwork ? "wifi-off" : "alert-circle"} size={22} color="#dc2626" />
        <div>
          <span className="ultra-error-title">{isNetwork ? "Connection Failure" : "Authentication Error"}</span>
          <span className="ultra-error-text">
            {isNetwork 
              ? "Could not reach the server. Please ensure the API is running, and that your browser/ad-blocker isn't interfering with requests."
              : errorMsg}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="ultra-login-container">
      {/* LEFT BRAND SIDE */}
      <div className="ultra-brand-side">
        <div className="ultra-brand-content">
          <div className="ultra-logo-box">
            <Icon name="zap" size={42} />
          </div>
          <h1 className="ultra-brand-title">26:07<br />Electronics</h1>
          <p className="ultra-brand-subtitle">
            Next-generation Point of Sale & Inventory Platform. Seamlessly unifying staff operations and customer experiences.
          </p>
          
          <div className="ultra-features">
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="cpu" size={18} /></div>
              <span>Real-time Ecosystem Sync</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="shield-check" size={18} /></div>
              <span>End-to-End Encrypted Data</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="trending-up" size={18} /></div>
              <span>Smart Financial Analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM SIDE */}
      <div className="ultra-form-side">
        <div className="ultra-form-wrapper">

          {/* Dynamic Connection Status Badge */}
          <div className={`ultra-conn-status ${connStatus}`}>
            <Icon name={connStatus === 'online' ? 'activity' : connStatus === 'offline' ? 'wifi-off' : 'clock'} size={14} />
            <span>{connStatus === 'online' ? 'Systems Operational' : 'Offline Mode'}</span>
          </div>

          {/* Sleek Segment Switch */}
          <div className="ultra-segment-control">
            <div className={`ultra-segment-indicator ${mode === 'customer' ? 'ultra-segment-customer' : ''}`}></div>
            <button 
              type="button"
              className={`ultra-segment-btn ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => { setMode('staff'); setStaffError(''); setCustomerError(''); }}
            >
              <Icon name="shield" size={16} /> STAFF
            </button>
            <button 
              type="button"
              className={`ultra-segment-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => { setMode('customer'); setStaffError(''); setCustomerError(''); setOtpStep('email'); }}
            >
              <Icon name="users" size={16} /> CUSTOMER
            </button>
          </div>

          <div className="ultra-form-content">
            {mode === 'staff' ? (
              <div className="ultra-staff-form">
                <div className="ultra-form-header">
                  <h2>Staff Portal</h2>
                  <p>Authenticate to access the operational console.</p>
                </div>

                <form onSubmit={handleStaffLogin}>
                  <div className="ultra-input-group">
                    <label><Icon name="user" size={15} /> Workspace Username</label>
                    <input 
                      type="text" 
                      className="ultra-input"
                      placeholder="Enter your system username" 
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div className="ultra-input-group">
                    <label><Icon name="lock" size={15} /> Encryption Key</label>
                    <div className="ultra-input-wrapper">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="ultra-input"
                        placeholder="••••••••" 
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        required 
                      />
                      <button type="button" className="ultra-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                        <Icon name={showPassword ? "eye-off" : "eye"} size={20} />
                      </button>
                    </div>
                  </div>

                  {renderError(staffError)}

                  <label className="ultra-remember">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span>Keep me authenticated on this device</span>
                  </label>

                  <button type="submit" className="ultra-btn" disabled={staffLoading}>
                    {staffLoading ? (
                      <><Icon name="loader" size={18} className="spin" /> Verifying Credentials...</>
                    ) : (
                      <>Authenticate Session <Icon name="arrow-right" size={18} /></>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div className="ultra-customer-form">
                <div className="ultra-form-header">
                  <h2>Customer Access</h2>
                  <p>Secure passwordless login via your registered email.</p>
                </div>

                <div className="ultra-stepper">
                  <div className={`ultra-step ${otpStep === 'email' ? 'active' : ''}`}></div>
                  <div className={`ultra-step ${otpStep === 'otp' ? 'active' : ''}`}></div>
                </div>

                <form onSubmit={otpStep === 'email' ? handleSendOtp : handleVerifyOtp}>
                  {otpStep === 'email' ? (
                    <>
                      <div className="ultra-input-group">
                        <label><Icon name="mail" size={15} /> Registered Email</label>
                        <input 
                          type="email" 
                          className="ultra-input"
                          placeholder="e.g. name@company.com" 
                          value={customerEmail} 
                          onChange={(e) => setCustomerEmail(e.target.value)} 
                          required 
                        />
                      </div>
                      
                      {renderError(customerError)}
                      
                      <button type="submit" className="ultra-btn customer" disabled={customerLoading}>
                        {customerLoading ? (
                          <><Icon name="loader" size={18} className="spin" /> Establishing Session...</>
                        ) : (
                          <>Send Security Code <Icon name="send" size={18} /></>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="ultra-input-group">
                        <label style={{ justifyContent: 'center', fontSize: '15px' }}>
                          <Icon name="shield-check" size={16} color="#10b981" /> Authorize Session
                        </label>
                        <input 
                          type="text" 
                          className="ultra-input ultra-otp-input"
                          placeholder="000000" 
                          maxLength="6"
                          value={customerOtp}
                          onChange={(e) => setCustomerOtp(e.target.value.replace(/\D/g, ''))}
                          required 
                        />
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        {otpTimer > 0 ? (
                          <div className="ultra-timer-badge">
                            <Icon name="clock" size={14} /> Code valid for {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                          </div>
                        ) : (
                          <div className="ultra-timer-badge" style={{ color: '#ef4444' }}>
                            <Icon name="alert-circle" size={14} /> Code expired. Please resend.
                          </div>
                        )}
                      </div>

                      {renderError(customerError)}
                      
                      <button type="submit" className="ultra-btn customer" disabled={customerLoading || customerOtp.length < 6}>
                        {customerLoading ? 'Confirming...' : 'Verify & Continue'}
                      </button>
                      
                      <button type="button" className="ultra-back-btn" onClick={() => setOtpStep('email')}>
                        <Icon name="arrow-left" size={16} /> Re-enter email address
                      </button>
                    </>
                  )}
                </form>
                
                <div className="ultra-security-badge">
                  <Icon name="lock" size={14} /> Secured by RSA 2048-bit Encryption
                </div>
              </div>
            )}
          </div>
          
        </div>
        
        <div className="ultra-footer">
          © {currentYear} 26:07 Electronics Inc. • Enterprise Systems
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;
