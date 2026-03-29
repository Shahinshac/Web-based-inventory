import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from './Icon.jsx';
import { apiPost } from './utils/api.js';
import { useOffline } from './hooks/useOffline.js';
import './LoginLayout.css';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('staff');           // 'staff' | 'customer'
  const [customerTab, setCustomerTab] = useState('login'); // 'login' | 'register'
  const { connectionStatus: connStatus } = useOffline(false);

  /* ── Staff state ──────────────────────────────── */
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [showStaffPw, setShowStaffPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  /* ── Customer login state ─────────────────────── */
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  /* ── Customer register state ──────────────────── */
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [regSuccess, setRegSuccess] = useState('');

  /* ── Remember me ──────────────────────────────── */
  useEffect(() => {
    try {
      const r = localStorage.getItem('rememberedUser');
      if (r) { setStaffUsername(r); setRememberMe(true); }
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      if (rememberMe && staffUsername) localStorage.setItem('rememberedUser', staffUsername);
      else if (!rememberMe) localStorage.removeItem('rememberedUser');
    } catch (_) {}
  }, [rememberMe, staffUsername]);

  /* ── Helpers ──────────────────────────────────── */
  const clearErrors = () => {
    setStaffError(''); setLoginError(''); setRegError(''); setRegSuccess('');
  };

  /* ── Staff login ──────────────────────────────── */
  const handleStaffLogin = useCallback(async (e) => {
    e.preventDefault();
    setStaffError('');
    if (!staffUsername || !staffPassword) { setStaffError('Please fill in all fields'); return; }
    setStaffLoading(true);
    try {
      const result = await onLogin(staffUsername, staffPassword, 'staff');
      if (result?.error) setStaffError(result.error);
    } catch (err) {
      setStaffError(err.message || 'Login failed.');
    } finally { setStaffLoading(false); }
  }, [staffUsername, staffPassword, onLogin]);

  /* ── Customer login ───────────────────────────── */
  const handleCustomerLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) { setLoginError('Please fill in all fields'); return; }
    setLoginLoading(true);
    try {
      const data = await apiPost('/api/customer-auth/login', { email: loginEmail, password: loginPassword });
      const result = await onLogin(loginEmail, null, 'customer', data.token);
      if (result?.error) setLoginError(result.error);
    } catch (err) {
      const msg = err.message || 'Login failed.';
      setLoginError(msg.includes('register first') ? 'No account found. Please register first.' : msg);
    } finally { setLoginLoading(false); }
  }, [loginEmail, loginPassword, onLogin]);

  /* ── Customer register ────────────────────────── */
  const handleCustomerRegister = useCallback(async (e) => {
    e.preventDefault();
    setRegError(''); setRegSuccess('');
    if (!regEmail || !regPassword || !regConfirm) { setRegError('Please fill in all fields'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters'); return; }
    setRegLoading(true);
    try {
      await apiPost('/api/customer-auth/register', { email: regEmail, password: regPassword });
      const successEmail = regEmail;
      setRegSuccess('Account created! You can now login.');
      setRegEmail(''); setRegPassword(''); setRegConfirm('');
      setTimeout(() => {
        setCustomerTab('login');
        setLoginEmail(successEmail);
        setRegSuccess('');
      }, 2000);
    } catch (err) {
      setRegError(err.message || 'Registration failed.');
    } finally { setRegLoading(false); }
  }, [regEmail, regPassword, regConfirm]);

  /* ── Render helpers ───────────────────────────── */
  const renderError = (msg) => {
    if (!msg) return null;
    const isNet = msg.includes('backend') || msg.includes('fetch') || msg.includes('server');
    return (
      <div className="ultra-error-pane">
        <Icon name={isNet ? 'wifi-off' : 'alert-circle'} size={20} color="#ef4444" />
        <div>
          <span className="ultra-error-title">{isNet ? 'Connection Failure' : 'Error'}</span>
          <span className="ultra-error-text">
            {isNet ? 'Could not reach the server. Please ensure the backend is running.' : msg}
          </span>
        </div>
      </div>
    );
  };

  const renderSuccess = (msg) => {
    if (!msg) return null;
    return (
      <div className="ultra-success-pane">
        <Icon name="check-circle" size={20} color="#10b981" />
        <div>
          <span className="ultra-success-title">Success</span>
          <span className="ultra-success-text">{msg}</span>
        </div>
      </div>
    );
  };

  const EyeBtn = ({ show, onToggle }) => (
    <button type="button" className="ultra-eye-btn" onClick={onToggle} tabIndex={-1}>
      <Icon name={show ? 'eye-off' : 'eye'} size={19} />
    </button>
  );

  const year = new Date().getFullYear();

  return (
    <div className="ultra-login-container">

      {/* ════════════════════ LEFT BRAND PANEL ════════════════════ */}
      <div className="ultra-brand-side">
        <div className="grid-overlay" />

        <div className="ultra-brand-content">
          <div className="ultra-logo-box">
            <Icon name="zap" size={38} />
          </div>

          <h1 className="ultra-brand-title">26:07<br />Electronics</h1>

          <p className="ultra-brand-subtitle">
            Next-generation Point of Sale &amp; Inventory Platform.
            Seamlessly unifying staff operations and customer experiences.
          </p>

          <div className="ultra-features">
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="cpu" size={17} /></div>
              <span>Real-time Ecosystem Sync</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="shield-check" size={17} /></div>
              <span>End-to-End Encrypted Data</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="trending-up" size={17} /></div>
              <span>Smart Financial Analytics</span>
            </div>
            <div className="ultra-feature-item">
              <div className="ultra-feature-icon"><Icon name="file-text" size={17} /></div>
              <span>Digital Invoice Management</span>
            </div>
          </div>

          <div className="ultra-trust-row">
            <div className="ultra-trust-badge">
              <Icon name="lock" size={12} color="#64748b" /> SSL Secured
            </div>
            <div className="ultra-trust-badge">
              <Icon name="database" size={12} color="#64748b" /> Atlas Cloud DB
            </div>
            <div className="ultra-trust-badge">
              <Icon name="globe" size={12} color="#64748b" /> Live on Vercel
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════ RIGHT FORM PANEL ════════════════════ */}
      <div className="ultra-form-side">
        <div className="ultra-form-wrapper">

          {/* Connection chip */}
          <div className={`ultra-conn-status ${connStatus}`}>
            <Icon name={connStatus === 'online' ? 'activity' : connStatus === 'offline' ? 'wifi-off' : 'clock'} size={13} />
            <span>{connStatus === 'online' ? 'Systems Operational' : 'Server Offline'}</span>
          </div>

          {/* Staff / Customer switcher */}
          <div className="ultra-segment-control">
            <div className={`ultra-segment-indicator ${mode === 'customer' ? 'ultra-segment-customer' : ''}`} />
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'staff' ? 'active' : ''}`}
              onClick={() => { setMode('staff'); clearErrors(); }}
            >
              <Icon name="shield" size={15} /> Staff
            </button>
            <button
              type="button"
              className={`ultra-segment-btn ${mode === 'customer' ? 'active' : ''}`}
              onClick={() => { setMode('customer'); clearErrors(); }}
            >
              <Icon name="users" size={15} /> Customer
            </button>
          </div>

          {/* ─────────── STAFF FORM ─────────── */}
          {mode === 'staff' ? (
            <div>
              <div className="ultra-form-header">
                <h2>Staff Portal</h2>
                <p>Authenticate to access the operational console.</p>
              </div>

              <form onSubmit={handleStaffLogin}>
                <div className="ultra-input-group">
                  <label><Icon name="user" size={13} /> Username</label>
                  <input
                    type="text"
                    className="ultra-input"
                    placeholder="Your system username"
                    value={staffUsername}
                    onChange={e => setStaffUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="ultra-input-group">
                  <label><Icon name="lock" size={13} /> Password</label>
                  <div className="ultra-input-wrapper">
                    <input
                      type={showStaffPw ? 'text' : 'password'}
                      className="ultra-input"
                      placeholder="••••••••"
                      value={staffPassword}
                      onChange={e => setStaffPassword(e.target.value)}
                      autoComplete="current-password"
                      style={{ paddingRight: 48 }}
                      required
                    />
                    <EyeBtn show={showStaffPw} onToggle={() => setShowStaffPw(p => !p)} />
                  </div>
                </div>

                {renderError(staffError)}

                <label className="ultra-remember">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <span>Keep me signed in on this device</span>
                </label>

                <button type="submit" className="ultra-btn" disabled={staffLoading}>
                  {staffLoading
                    ? <><Icon name="loader" size={17} className="spin" /> Verifying…</>
                    : <>Authenticate <Icon name="arrow-right" size={17} /></>}
                </button>
              </form>
            </div>

          ) : (
            /* ─────────── CUSTOMER FORM ─────────── */
            <div>
              <div className="ultra-form-header">
                <h2>Customer Portal</h2>
                <p>Sign in or create an account using your billing email.</p>
              </div>

              {/* Login ↔ Register tab switcher */}
              <div className="ultra-sub-tabs">
                <button
                  type="button"
                  className={`ultra-sub-tab ${customerTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setCustomerTab('login'); clearErrors(); }}
                >
                  <Icon name="log-in" size={14} /> Sign In
                </button>
                <button
                  type="button"
                  className={`ultra-sub-tab ${customerTab === 'register' ? 'active' : ''}`}
                  onClick={() => { setCustomerTab('register'); clearErrors(); }}
                >
                  <Icon name="user-plus" size={14} /> Register
                </button>
              </div>

              {customerTab === 'login' ? (
                /* ── LOGIN ── */
                <form onSubmit={handleCustomerLogin}>
                  <div className="ultra-input-group">
                    <label><Icon name="mail" size={13} /> Email Address</label>
                    <input
                      type="email"
                      className="ultra-input"
                      placeholder="name@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="ultra-input-group">
                    <label><Icon name="lock" size={13} /> Password</label>
                    <div className="ultra-input-wrapper">
                      <input
                        type={showLoginPw ? 'text' : 'password'}
                        className="ultra-input"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        autoComplete="current-password"
                        style={{ paddingRight: 48 }}
                        required
                      />
                      <EyeBtn show={showLoginPw} onToggle={() => setShowLoginPw(p => !p)} />
                    </div>
                  </div>

                  {renderError(loginError)}

                  <button type="submit" className="ultra-btn customer" disabled={loginLoading}>
                    {loginLoading
                      ? <><Icon name="loader" size={17} className="spin" /> Signing In…</>
                      : <>Sign In <Icon name="arrow-right" size={17} /></>}
                  </button>

                  <p className="ultra-switch-link">
                    No account yet?{' '}
                    <button type="button" onClick={() => { setCustomerTab('register'); clearErrors(); }}>
                      Register now →
                    </button>
                  </p>
                </form>

              ) : (
                /* ── REGISTER ── */
                <form onSubmit={handleCustomerRegister}>
                  <div className="ultra-input-group">
                    <label><Icon name="mail" size={13} /> Billing Email</label>
                    <input
                      type="email"
                      className="ultra-input"
                      placeholder="Email used during purchase"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="ultra-input-group">
                    <label><Icon name="lock" size={13} /> Create Password</label>
                    <div className="ultra-input-wrapper">
                      <input
                        type={showRegPw ? 'text' : 'password'}
                        className="ultra-input"
                        placeholder="Minimum 6 characters"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        autoComplete="new-password"
                        style={{ paddingRight: 48 }}
                        required
                      />
                      <EyeBtn show={showRegPw} onToggle={() => setShowRegPw(p => !p)} />
                    </div>
                  </div>

                  <div className="ultra-input-group">
                    <label><Icon name="shield-check" size={13} /> Confirm Password</label>
                    <input
                      type="password"
                      className="ultra-input"
                      placeholder="Re-enter your password"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <div className="ultra-info-note">
                    <Icon name="info" size={14} color="#6366f1" />
                    <span>Only emails in our billing database can register. Use the exact email you provided during your purchase.</span>
                  </div>

                  {renderError(regError)}
                  {renderSuccess(regSuccess)}

                  <button type="submit" className="ultra-btn customer" disabled={regLoading}>
                    {regLoading
                      ? <><Icon name="loader" size={17} className="spin" /> Creating Account…</>
                      : <>Create Account <Icon name="user-plus" size={17} /></>}
                  </button>

                  <p className="ultra-switch-link">
                    Already registered?{' '}
                    <button type="button" onClick={() => { setCustomerTab('login'); clearErrors(); }}>
                      Sign in here →
                    </button>
                  </p>
                </form>
              )}

              <div className="ultra-security-badge">
                <Icon name="lock" size={12} /> AES-256 Encrypted · JWT Sessions
              </div>
            </div>
          )}
        </div>

        <div className="ultra-footer">
          © {year} 26:07 Electronics Inc. · Enterprise POS Platform
        </div>
      </div>
    </div>
  );
};

Login.propTypes = { onLogin: PropTypes.func.isRequired };
export default Login;
