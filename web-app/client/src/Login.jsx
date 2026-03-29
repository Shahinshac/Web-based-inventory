import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { apiPost } from './utils/api.js';
import { useOffline } from './hooks/useOffline.js';
import './LoginLayout.css';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff'); // 'staff' or 'customer'
  const [customerTab, setCustomerTab] = useState('login'); // 'login' or 'register'
  const { connectionStatus: connStatus } = useOffline(false);

  // Staff login
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Customer login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState('');

  // Customer register
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

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
      setStaffError(error.message || 'Login failed.');
    } finally {
      setStaffLoading(false);
    }
  }, [staffUsername, staffPassword, onLogin]);

  // Handle customer login
  const handleCustomerLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Please fill in all fields');
      return;
    }
    setLoginLoading(true);
    try {
      const data = await apiPost('/api/users/customer-login', { email: loginEmail, password: loginPassword });
      const result = await onLogin(loginEmail, null, 'customer', data.token);
      if (result && result.error) {
        setLoginError(result.error);
      }
    } catch (error) {
      const msg = error.message || 'Login failed.';
      if (msg.includes('needs_registration') || msg.includes('register first')) {
        setLoginError('No account found. Please register first.');
      } else {
        setLoginError(msg);
      }
    } finally {
      setLoginLoading(false);
    }
  }, [loginEmail, loginPassword, onLogin]);

  // Handle customer registration
  const handleCustomerRegister = useCallback(async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    if (!regEmail || !regPassword || !regConfirmPassword) {
      setRegError('Please fill in all fields');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }
    setRegLoading(true);
    try {
      await apiPost('/api/users/customer-register', { email: regEmail, password: regPassword });
      setRegSuccess('Account created! You can now login with your email and password.');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      // Switch to login tab after 2 seconds
      setTimeout(() => {
        setCustomerTab('login');
        setLoginEmail(regEmail);
        setRegSuccess('');
      }, 2000);
    } catch (error) {
      setRegError(error.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  }, [regEmail, regPassword, regConfirmPassword]);

  const currentYear = new Date().getFullYear();

  const renderError = (errorMsg) => {
    if (!errorMsg) return null;
    const isNetwork = errorMsg.includes('backend is running') || errorMsg.includes('Connection error') || errorMsg.includes('fetch');
    return (
      <div className="ultra-error-pane">
        <Icon name={isNetwork ? "wifi-off" : "alert-circle"} size={22} color="#dc2626" />
        <div>
          <span className="ultra-error-title">{isNetwork ? "Connection Failure" : "Error"}</span>
          <span className="ultra-error-text">
            {isNetwork
              ? "Could not reach the server. Make sure the API server is running."
              : errorMsg}
          </span>
        </div>
      </div>
    );
  };

  const renderSuccess = (msg) => {
    if (!msg) return null;
    return (
      <div className="ultra-error-pane" style={{ borderColor: '#10b981', background: 'rgba(16,185,129,0.08)' }}>
        <Icon name="check-circle" size={22} color="#10b981" />
        <div>
          <span className="ultra-error-title" style={{ color: '#10b981' }}>Success</span>
          <span className="ultra-error-text">{msg}</span>
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
            Next-generation Point of Sale &amp; Inventory Platform. Seamlessly unifying staff operations and customer experiences.
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

          {/* Connection Status Badge */}
          <div className={`ultra-conn-status ${connStatus}`}>
            <Icon name={connStatus === 'online' ? 'activity' : connStatus === 'offline' ? 'wifi-off' : 'clock'} size={14} />
            <span>{connStatus === 'online' ? 'Systems Operational' : 'Offline Mode'}</span>
          </div>

          {/* Staff / Customer Switch */}
          <div className="ultra-segment-control">
            <div className={`ultra-segment-indicator ${mode === 'customer' ? 'ultra-segment-customer' : ''}`}></div>
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => { setMode('staff'); setStaffError(''); setLoginError(''); setRegError(''); }}
            >
              <Icon name="shield" size={16} /> STAFF
            </button>
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => { setMode('customer'); setStaffError(''); setLoginError(''); setRegError(''); }}
            >
              <Icon name="users" size={16} /> CUSTOMER
            </button>
          </div>

          <div className="ultra-form-content">
            {mode === 'staff' ? (
              /* ── STAFF LOGIN ── */
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
                    <label><Icon name="lock" size={15} /> Password</label>
                    <div className="ultra-input-wrapper">
                      <input
                        type={showStaffPassword ? "text" : "password"}
                        className="ultra-input"
                        placeholder="••••••••"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        required
                      />
                      <button type="button" className="ultra-eye-btn" onClick={() => setShowStaffPassword(!showStaffPassword)}>
                        <Icon name={showStaffPassword ? "eye-off" : "eye"} size={20} />
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
              /* ── CUSTOMER PORTAL ── */
              <div className="ultra-customer-form">
                <div className="ultra-form-header">
                  <h2>Customer Portal</h2>
                  <p>Login or register using your billing email.</p>
                </div>

                {/* Login / Register Tab Switch */}
                <div className="ultra-sub-tabs">
                  <button
                    type="button"
                    className={`ultra-sub-tab ${customerTab === 'login' ? 'active' : ''}`}
                    onClick={() => { setCustomerTab('login'); setLoginError(''); setRegError(''); setLoginSuccess(''); setRegSuccess(''); }}
                  >
                    <Icon name="log-in" size={15} /> Login
                  </button>
                  <button
                    type="button"
                    className={`ultra-sub-tab ${customerTab === 'register' ? 'active' : ''}`}
                    onClick={() => { setCustomerTab('register'); setLoginError(''); setRegError(''); setLoginSuccess(''); setRegSuccess(''); }}
                  >
                    <Icon name="user-plus" size={15} /> Register
                  </button>
                </div>

                {customerTab === 'login' ? (
                  /* ── CUSTOMER LOGIN ── */
                  <form onSubmit={handleCustomerLogin}>
                    <div className="ultra-input-group">
                      <label><Icon name="mail" size={15} /> Email Address</label>
                      <input
                        type="email"
                        className="ultra-input"
                        placeholder="e.g. name@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="ultra-input-group">
                      <label><Icon name="lock" size={15} /> Password</label>
                      <div className="ultra-input-wrapper">
                        <input
                          type={showLoginPassword ? "text" : "password"}
                          className="ultra-input"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button type="button" className="ultra-eye-btn" onClick={() => setShowLoginPassword(!showLoginPassword)}>
                          <Icon name={showLoginPassword ? "eye-off" : "eye"} size={20} />
                        </button>
                      </div>
                    </div>

                    {renderError(loginError)}
                    {renderSuccess(loginSuccess)}

                    <button type="submit" className="ultra-btn customer" disabled={loginLoading}>
                      {loginLoading ? (
                        <><Icon name="loader" size={18} className="spin" /> Signing In...</>
                      ) : (
                        <>Sign In <Icon name="arrow-right" size={18} /></>
                      )}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                      No account yet?{' '}
                      <button
                        type="button"
                        onClick={() => setCustomerTab('register')}
                        style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: 0 }}
                      >
                        Register now →
                      </button>
                    </p>
                  </form>
                ) : (
                  /* ── CUSTOMER REGISTER ── */
                  <form onSubmit={handleCustomerRegister}>
                    <div className="ultra-input-group">
                      <label><Icon name="mail" size={15} /> Billing Email</label>
                      <input
                        type="email"
                        className="ultra-input"
                        placeholder="Email used during purchase"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="ultra-input-group">
                      <label><Icon name="lock" size={15} /> Create Password</label>
                      <div className="ultra-input-wrapper">
                        <input
                          type={showRegPassword ? "text" : "password"}
                          className="ultra-input"
                          placeholder="Minimum 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                        />
                        <button type="button" className="ultra-eye-btn" onClick={() => setShowRegPassword(!showRegPassword)}>
                          <Icon name={showRegPassword ? "eye-off" : "eye"} size={20} />
                        </button>
                      </div>
                    </div>

                    <div className="ultra-input-group">
                      <label><Icon name="shield-check" size={15} /> Confirm Password</label>
                      <input
                        type="password"
                        className="ultra-input"
                        placeholder="Re-enter your password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    {renderError(regError)}
                    {renderSuccess(regSuccess)}

                    <div className="ultra-info-note">
                      <Icon name="info" size={14} color="#6366f1" />
                      <span>Only emails in our billing database can register. Use the email you gave during purchase.</span>
                    </div>

                    <button type="submit" className="ultra-btn customer" disabled={regLoading}>
                      {regLoading ? (
                        <><Icon name="loader" size={18} className="spin" /> Creating Account...</>
                      ) : (
                        <>Create Account <Icon name="user-plus" size={18} /></>
                      )}
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => setCustomerTab('login')}
                        style={{ color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', padding: 0 }}
                      >
                        Login here →
                      </button>
                    </p>
                  </form>
                )}

                <div className="ultra-security-badge">
                  <Icon name="lock" size={14} /> Secured by AES-256 Encryption
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
