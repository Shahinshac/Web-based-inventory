/**
 * @file Login.jsx
 * @description Ultra-premium centered authentication portal - Staff & Customer
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from './Icon.jsx';
import './LoginLayout.css';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff'); // 'staff' or 'customer'
  const [customerTab, setCustomerTab] = useState('login'); // 'login' or 'register'
  
  // Staff state
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffPw, setShowStaffPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Customer state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  const [customerError, setCustomerError] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);

  const [connStatus, setConnStatus] = useState('online');

  // Load remembered staff username
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUser');
    if (remembered) {
      setStaffUsername(remembered);
      setRememberMe(true);
    }

    const handleOnline = () => setConnStatus('online');
    const handleOffline = () => setConnStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setConnStatus(navigator.onLine ? 'online' : 'offline');

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save/remove remembered username
  useEffect(() => {
    if (rememberMe && staffUsername) {
      localStorage.setItem('rememberedUser', staffUsername);
    } else if (!rememberMe) {
      localStorage.removeItem('rememberedUser');
    }
  }, [rememberMe, staffUsername]);

  const clearErrors = () => {
    setStaffError('');
    setCustomerError('');
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffLoading(true);
    try {
      const result = await onLogin(staffUsername, staffPassword, 'staff');
      if (result?.error) setStaffError(result.error);
    } catch (err) {
      setStaffError('System error. Please try again.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    setCustomerError('');
    setCustomerLoading(true);
    try {
      const result = await onLogin(loginEmail, loginPassword, 'customer');
      if (result?.error) setCustomerError(result.error);
    } catch (err) {
      setCustomerError('Login failed. Check your connection.');
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    setCustomerError('');
    setCustomerLoading(true);
    try {
      // In this app, register is often a separate API call, 
      // but for simplicity in this centralized onLogin handler:
      const result = await onLogin({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword
      }, null, 'customer_register');
      
      if (result?.error) setCustomerError(result.error);
    } catch (err) {
      setCustomerError('Registration failed. Try again.');
    } finally {
      setCustomerLoading(false);
    }
  };

  const renderError = (msg) => msg && (
    <div className="ultra-error">
      <Icon name="alert-circle" size={14} />
      <span>{msg}</span>
    </div>
  );

  const EyeBtn = ({ show, onToggle }) => (
    <button type="button" className="ultra-eye" onClick={onToggle}>
      <Icon name={show ? 'eye' : 'eye-off'} size={18} />
    </button>
  );

  return (
    <div className="ultra-login-container">
      <div className="grid-overlay" />
      <div className="bg-blobs">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="ultra-card">
        {/* Connection status */}
        <div className={`ultra-conn-status ${connStatus}`}>
          <Icon name={connStatus === 'online' ? 'activity' : 'wifi-off'} size={12} />
          <span>{connStatus === 'online' ? 'Online' : 'Offline'}</span>
        </div>

        <div className="ultra-header">
          <div className="ultra-logo-box">
            <Icon name="zap" size={32} />
          </div>
          <h1 className="ultra-brand-title">26:07<br />Electronics</h1>
          <p className="ultra-brand-subtitle">Enterprise POS & Inventory Platform</p>
        </div>

        {/* Staff / Customer switcher */}
        <div className="ultra-segment-control">
          <div className={`ultra-segment-indicator ${mode === 'customer' ? 'ultra-segment-customer' : ''}`} />
          <button
            type="button"
            className={`ultra-segment-btn ${mode === 'staff' ? 'active' : ''}`}
            onClick={() => { setMode('staff'); clearErrors(); }}
          >
            <Icon name="shield" size={14} /> Staff
          </button>
          <button
            type="button"
            className={`ultra-segment-btn ${mode === 'customer' ? 'active' : ''}`}
            onClick={() => { setMode('customer'); clearErrors(); }}
          >
            <Icon name="users" size={14} /> Customer
          </button>
        </div>

        {/* ─────────── STAFF FORM ─────────── */}
        {mode === 'staff' ? (
          <div className="fade-in">
            <form onSubmit={handleStaffLogin}>
              <div className="ultra-input-group">
                <label>Username</label>
                <div className="ultra-input-wrapper">
                  <span className="input-icon"><Icon name="user" size={18} /></span>
                  <input
                    type="text"
                    className="ultra-input has-icon"
                    placeholder="Enter username"
                    value={staffUsername}
                    onChange={e => setStaffUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="ultra-input-group">
                <label>Password</label>
                <div className="ultra-input-wrapper">
                  <span className="input-icon"><Icon name="lock" size={18} /></span>
                  <input
                    type={showStaffPw ? 'text' : 'password'}
                    className="ultra-input has-icon"
                    placeholder="Enter password"
                    value={staffPassword}
                    onChange={e => setStaffPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <EyeBtn show={showStaffPw} onToggle={() => setShowStaffPw(p => !p)} />
                </div>
              </div>

              {renderError(staffError)}

              <div className="ultra-options">
                <label className="ultra-remember">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Keep me signed in</span>
                </label>
                <button type="button" className="ultra-link">Forgot Password?</button>
              </div>

              <button type="submit" className="ultra-btn" disabled={staffLoading}>
                {staffLoading
                  ? <><Icon name="loader" size={18} className="spin" /> Authenticating...</>
                  : <>Sign In <Icon name="arrow-right" size={18} /></>}
              </button>
            </form>
          </div>
        ) : (
          /* ─────────── CUSTOMER FORM ─────────── */
          <div className="fade-in">
            <div className="ultra-sub-tabs">
              <button
                type="button"
                className={`ultra-sub-tab ${customerTab === 'login' ? 'active' : ''}`}
                onClick={() => { setCustomerTab('login'); clearErrors(); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`ultra-sub-tab ${customerTab === 'register' ? 'active' : ''}`}
                onClick={() => { setCustomerTab('register'); clearErrors(); }}
              >
                Register
              </button>
            </div>

            {customerTab === 'login' ? (
              <form onSubmit={handleCustomerLogin}>
                <div className="ultra-input-group">
                  <label>Email Address</label>
                  <div className="ultra-input-wrapper">
                    <span className="input-icon"><Icon name="mail" size={18} /></span>
                    <input
                      type="email"
                      className="ultra-input has-icon"
                      placeholder="name@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="ultra-input-group">
                  <label>Password</label>
                  <div className="ultra-input-wrapper">
                    <span className="input-icon"><Icon name="lock" size={18} /></span>
                    <input
                      type={showLoginPw ? 'text' : 'password'}
                      className="ultra-input has-icon"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                    />
                    <EyeBtn show={showLoginPw} onToggle={() => setShowLoginPw(p => !p)} />
                  </div>
                </div>

                {renderError(customerError)}

                <button type="submit" className="ultra-btn" disabled={customerLoading}>
                  {customerLoading
                    ? <><Icon name="loader" size={18} className="spin" /> Signing In...</>
                    : <>Customer Login <Icon name="user" size={18} /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCustomerRegister}>
                <div className="ultra-input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="ultra-input"
                    placeholder="John Doe"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="ultra-input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="ultra-input"
                    placeholder="john@example.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="ultra-input-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    className="ultra-input"
                    placeholder="9876543210"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="ultra-input-group">
                  <label>Create Password</label>
                  <div className="ultra-input-wrapper">
                    <input
                      type={showRegPw ? 'text' : 'password'}
                      className="ultra-input"
                      placeholder="Minimum 6 chars"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <EyeBtn show={showRegPw} onToggle={() => setShowRegPw(p => !p)} />
                  </div>
                </div>

                {renderError(customerError)}

                <button type="submit" className="ultra-btn" disabled={customerLoading}>
                  {customerLoading
                    ? <><Icon name="loader" size={18} className="spin" /> Creating Account...</>
                    : <>Register Now <Icon name="user-plus" size={18} /></>}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="ultra-footer">
          <p>© {new Date().getFullYear()} 26:07 Electronics. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
