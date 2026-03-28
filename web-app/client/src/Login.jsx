/**
 * @file Login.jsx
 * @description Secure authentication component with dual modes
 * - Staff: Username + Password
 * - Customer: Email + OTP (One-Time Password) - SAFEST METHOD
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { API } from './utils/api.js';

const Login = ({ onLogin }) => {
  // ==================== STATE ====================

  // Staff login state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Customer login state - OTP based
  const [customerEmail, setCustomerEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [otpStep, setOtpStep] = useState('email'); // 'email' or 'otp'
  const [otpTimer, setOtpTimer] = useState(0);

  // Customer registration state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerError, setRegisterError] = useState('');

  // UI state
  const [userMode, setUserMode] = useState('staff'); // 'staff' or 'customer'
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ==================== EFFECTS ====================

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedStaff');
      if (remembered) {
        setStaffUsername(remembered);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Failed to load remembered user:', error);
    }
  }, []);

  useEffect(() => {
    try {
      if (rememberMe && staffUsername) {
        localStorage.setItem('rememberedStaff', staffUsername);
      } else if (!rememberMe) {
        localStorage.removeItem('rememberedStaff');
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

  // ==================== HANDLERS ====================

  /**
   * STAFF LOGIN: Username + Password
   */
  const onStaffLoginSubmit = useCallback(async (e) => {
    e.preventDefault();
    setStaffError('');

    if (!staffUsername || !staffPassword) {
      setStaffError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await onLogin(staffUsername, staffPassword, 'staff');
      if (result && result.error) {
        setStaffError(result.error);
      }
    } catch (error) {
      setStaffError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [staffUsername, staffPassword, onLogin]);

  /**
   * CUSTOMER LOGIN - STEP 1: Send OTP to Email
   */
  const onSendOTP = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!customerEmail) {
      setCustomerError('Please enter your email');
      return;
    }

    if (!customerEmail.includes('@')) {
      setCustomerError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Call backend to send OTP
      const response = await fetch(API('/api/users/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, type: 'login' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send OTP');
      }

      // Move to OTP entry step
      setOtpStep('otp');
      setOtpTimer(300); // 5 minutes timer
    } catch (error) {
      setCustomerError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customerEmail]);

  /**
   * CUSTOMER LOGIN - STEP 2: Verify OTP and Login
   */
  const onVerifyOTP = useCallback(async (e) => {
    e.preventDefault();
    setCustomerError('');

    if (!otpCode || otpCode.length !== 6) {
      setCustomerError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Call backend to verify OTP
      const response = await fetch(API('/api/users/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: customerEmail, otp: otpCode })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid OTP');
      }

      const data = await response.json();

      // Auto-login after OTP verification
      const result = await onLogin(customerEmail, null, 'customer', data.token);
      if (result && result.error) {
        setCustomerError(result.error);
      }
    } catch (error) {
      setCustomerError(error.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [customerEmail, otpCode, onLogin]);

  /**
   * CUSTOMER REGISTRATION
   */
  const onRegisterSubmit = useCallback(async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!registerEmail || !registerName || !registerPhone) {
      setRegisterError('Please fill in all fields');
      return;
    }

    if (!registerEmail.includes('@')) {
      setRegisterError('Please enter a valid email');
      return;
    }

    if (registerPhone.length !== 10) {
      setRegisterError('Phone must be 10 digits');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API('/api/users/register-customer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          name: registerName,
          phone: registerPhone,
          role: 'customer'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      // Switch to login after successful registration
      setIsRegistering(false);
      setCustomerEmail(registerEmail);
      setRegisterEmail('');
      setRegisterName('');
      setRegisterPhone('');
      setCustomerError('Registration successful! Check your email for OTP.');
      setOtpStep('email'); // Reset to email step
    } catch (error) {
      setRegisterError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [registerEmail, registerName, registerPhone]);

  /**
   * Switch between login modes
   */
  const switchMode = useCallback((newMode) => {
    setUserMode(newMode);
    setStaffUsername('');
    setStaffPassword('');
    setStaffError('');
    setCustomerEmail('');
    setOtpCode('');
    setCustomerError('');
    setIsRegistering(false);
    setOtpStep('email');
    setOtpTimer(0);
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // ==================== RENDER HELPERS ====================

  const currentYear = new Date().getFullYear();

  // ==================== RENDER ====================

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* ==================== BRANDING SIDE ==================== */}
        <div className="login-brand-side">
          <div className="brand-inner">
            <div className="brand-logo-box">
              <Icon name="spark" size={36} />
            </div>
            <h1 className="brand-name">26:07 Electronics</h1>
            <p className="brand-tagline">Premium Electronics & Smart Solutions</p>
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

                <form onSubmit={onStaffLoginSubmit} className="login-form">
                  <div className="field">
<<<<<<< HEAD
                    <label htmlFor="login-username">
                      <Icon name="user" size={14} />
=======
                    <label htmlFor="staff-username">
                      <Icon name="customers" size={14} />
>>>>>>> 35b56c38bdad5fa42c327244c591f3bdd08aaff7
                      Username
                    </label>
                    <input
                      id="staff-username"
                      type="text"
                      value={staffUsername}
                      onChange={(e) => setStaffUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="staff-password">
                      <Icon name="lock" size={14} />
                      Password
                    </label>
                    <div className="password-field">
                      <input
                        id="staff-password"
                        type={showPassword ? "text" : "password"}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
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

                  <label className="remember-me" htmlFor="remember-staff">
                    <input
                      id="remember-staff"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.currentTarget.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  {staffError && (
                    <div className="error-msg" role="alert">
                      <Icon name="alert-circle" size={14} />
                      {staffError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !staffUsername || !staffPassword}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

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
                  <p>{isRegistering ? 'Register to get started' : 'Secure login with OTP'}</p>
                </div>

                {isRegistering ? (
                  /* REGISTRATION FORM */
                  <form onSubmit={onRegisterSubmit} className="login-form">
                    <div className="field">
                      <label htmlFor="register-name">
                        <Icon name="user" size={14} />
                        Full Name
                      </label>
                      <input
                        id="register-name"
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Your full name"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="register-email">
                        <Icon name="mail" size={14} />
                        Email Address
                      </label>
                      <input
                        id="register-email"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div className="field">
                      <label htmlFor="register-phone">
                        <Icon name="call" size={14} />
                        Phone Number
                      </label>
                      <input
                        id="register-phone"
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit phone number"
                        required
                        maxLength="10"
                      />
                      {registerPhone.length > 0 && registerPhone.length !== 10 && (
                        <p className="field-hint error">Must be 10 digits</p>
                      )}
                    </div>

                    {registerError && (
                      <div className="error-msg" role="alert">
                        <Icon name="alert-circle" size={14} />
                        {registerError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading || !registerEmail || !registerName || !registerPhone}
                    >
                      {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <div className="form-footer">
                      <p>Already have an account?</p>
                      <button
                        type="button"
                        className="switch-link"
                        onClick={() => setIsRegistering(false)}
                      >
                        Login here
                      </button>
                    </div>
                  </form>
                ) : otpStep === 'email' ? (
                  /* OTP STEP 1: EMAIL ENTRY */
                  <form onSubmit={onSendOTP} className="login-form">
                    <div className="field">
                      <label htmlFor="customer-email">
                        <Icon name="mail" size={14} />
                        Email Address
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="security-badge">
                      <Icon name="shield" size={16} />
                      <span>Secure OTP login - No password stored</span>
                    </div>

                    {customerError && (
                      <div className="error-msg" role="alert">
                        <Icon name="alert-circle" size={14} />
                        {customerError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading || !customerEmail}
                    >
                      {loading ? 'Sending OTP...' : 'Send OTP to Email'}
                    </button>

                    <div className="form-footer">
                      <p>Don't have an account?</p>
                      <button
                        type="button"
                        className="switch-link"
                        onClick={() => setIsRegistering(true)}
                      >
                        Register here
                      </button>
                    </div>
                  </form>
                ) : (
                  /* OTP STEP 2: OTP VERIFICATION */
                  <form onSubmit={onVerifyOTP} className="login-form">
                    <div className="otp-section">
                      <p className="otp-message">
                        Enter the 6-digit OTP sent to <strong>{customerEmail}</strong>
                      </p>

                      <div className="field">
                        <label htmlFor="otp-code">
                          <Icon name="shield" size={14} />
                          One-Time Password
                        </label>
                        <input
                          id="otp-code"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength="6"
                          required
                          autoFocus
                          inputMode="numeric"
                          className="otp-input"
                        />
                      </div>

                      {otpTimer > 0 && (
                        <p className="otp-timer">
                          OTP expires in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                        </p>
                      )}

                      {otpTimer === 0 && (
                        <button
                          type="button"
                          className="resend-btn"
                          onClick={onSendOTP}
                        >
                          <Icon name="refresh" size={14} />
                          Resend OTP
                        </button>
                      )}
                    </div>

                    {customerError && (
                      <div className="error-msg" role="alert">
                        <Icon name="alert-circle" size={14} />
                        {customerError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading || otpCode.length !== 6}
                    >
                      {loading ? 'Verifying...' : 'Verify OTP & Login'}
                    </button>

                    <div className="form-footer">
                      <button
                        type="button"
                        className="switch-link"
                        onClick={() => {
                          setOtpStep('email');
                          setOtpCode('');
                          setCustomerError('');
                        }}
                      >
                        Use different email
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

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default Login;
