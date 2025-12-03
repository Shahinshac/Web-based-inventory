import React, { useState, useEffect } from 'react'
import Icon from './Icon.jsx'

function LoginForm({ authUsername, authPassword, setAuthUsername, setAuthPassword, authError, handleAuth }) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isFocused, setIsFocused] = useState({ username: false, password: false })

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedUser')
      if (remembered) {
        setAuthUsername(remembered)
        setRememberMe(true)
      }
    } catch (e) {
      console.error('Failed to load remembered user:', e)
    }
  }, [setAuthUsername])

  useEffect(() => {
    if (rememberMe && authUsername) {
      try {
        localStorage.setItem('rememberedUser', authUsername)
      } catch (e) {
        console.error('Failed to save remembered user:', e)
      }
    } else if (!rememberMe) {
      try {
        localStorage.removeItem('rememberedUser')
      } catch (e) {
        console.error('Failed to remove remembered user:', e)
      }
    }
  }, [rememberMe, authUsername])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!authUsername || !authPassword) {
      return
    }
    setLoading(true)
    try {
      await handleAuth()
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form-container">
      <div className="form-field">
        <label className="login-form-label">
          <Icon name="customers" size={18} />
          <span>Username</span>
        </label>
        <div className={`input-wrapper ${isFocused.username ? 'focused' : ''}`}>
          <input
            className="login-form-input"
            type="text"
            value={authUsername}
            onChange={(e) => setAuthUsername(e.target.value)}
            onFocus={() => setIsFocused(prev => ({...prev, username: true}))}
            onBlur={() => setIsFocused(prev => ({...prev, username: false}))}
            placeholder="Enter your username"
            required
            autoFocus
            autoComplete="username"
          />
        </div>
      </div>

      <div className="form-field">
        <label className="login-form-label">
          <Icon name="lock" size={18} />
          <span>Password</span>
        </label>
        <div className={`input-wrapper password-wrapper ${isFocused.password ? 'focused' : ''}`}>
          <input
            className="login-form-input"
            type={showPassword ? "text" : "password"}
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            onFocus={() => setIsFocused(prev => ({...prev, password: true}))}
            onBlur={() => setIsFocused(prev => ({...prev, password: false}))}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex="-1"
          >
            <Icon name={showPassword ? "lock" : "eye"} size={18} />
          </button>
        </div>
      </div>

      <div className="form-extras">
        <label className="remember-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="checkbox-label">Remember me</span>
        </label>
      </div>

      {authError && (
        <div className="login-error-alert">
          <Icon name="close" size={16} />
          <span>{authError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !authUsername || !authPassword}
        className="login-submit-btn"
      >
        {loading ? (
          <>
            <span className="spinner-login"></span>
            <span>Logging in...</span>
          </>
        ) : (
          <>
            <Icon name="dashboard" size={18} />
            <span>Login to Dashboard</span>
          </>
        )}
      </button>
    </form>
  )
}

function RegisterForm({ registerUsername, registerPassword, registerEmail, setRegisterUsername, setRegisterPassword, setRegisterEmail, registerError, handleRegister }) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState({ username: false, email: false, password: false })
  const [passwordStrength, setPasswordStrength] = useState('')

  const checkPasswordStrength = (pass) => {
    if (!pass) return ''
    if (pass.length < 6) return 'weak'
    if (pass.length >= 6 && pass.length < 10) return 'medium'
    if (pass.length >= 10 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) return 'strong'
    return 'medium'
  }

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(registerPassword))
  }, [registerPassword])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!registerUsername || !registerEmail || !registerPassword) {
      return
    }
    setLoading(true)
    try {
      await handleRegister()
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form-container">
      <div className="form-field">
        <label className="login-form-label">
          <Icon name="customers" size={18} />
          <span>Username</span>
        </label>
        <div className={`input-wrapper ${isFocused.username ? 'focused' : ''}`}>
          <input
            className="login-form-input"
            type="text"
            value={registerUsername}
            onChange={(e) => setRegisterUsername(e.target.value)}
            onFocus={() => setIsFocused(prev => ({...prev, username: true}))}
            onBlur={() => setIsFocused(prev => ({...prev, username: false}))}
            placeholder="Choose a unique username (min 3 characters)"
            required
            minLength="3"
            autoComplete="username"
            autoFocus
          />
        </div>
      </div>

      <div className="form-field">
        <label className="login-form-label">
          <Icon name="email" size={18} />
          <span>Email Address</span>
        </label>
        <div className={`input-wrapper ${isFocused.email ? 'focused' : ''}`}>
          <input
            className="login-form-input"
            type="email"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            onFocus={() => setIsFocused(prev => ({...prev, email: true}))}
            onBlur={() => setIsFocused(prev => ({...prev, email: false}))}
            placeholder="Enter your email address"
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div className="form-field">
        <label className="login-form-label">
          <Icon name="lock" size={18} />
          <span>Password</span>
        </label>
        <div className={`input-wrapper password-wrapper ${isFocused.password ? 'focused' : ''}`}>
          <input
            className="login-form-input"
            type={showPassword ? "text" : "password"}
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            onFocus={() => setIsFocused(prev => ({...prev, password: true}))}
            onBlur={() => setIsFocused(prev => ({...prev, password: false}))}
            placeholder="Create a strong password (min 6 characters)"
            required
            minLength="6"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex="-1"
          >
            <Icon name={showPassword ? "lock" : "eye"} size={18} />
          </button>
        </div>
        {registerPassword && (
          <div className={`password-strength password-strength-${passwordStrength}`}>
            <div className="strength-bar">
              <div className="strength-fill"></div>
            </div>
            <span className="strength-text">
              {passwordStrength === 'weak' && 'Weak password'}
              {passwordStrength === 'medium' && 'Medium password'}
              {passwordStrength === 'strong' && 'Strong password'}
            </span>
          </div>
        )}
      </div>

      {registerError && (
        <div className="login-error-alert">
          <Icon name="close" size={16} />
          <span>{registerError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !registerUsername || !registerEmail || !registerPassword || registerPassword.length < 6}
        className="login-submit-btn register-btn"
      >
        {loading ? (
          <>
            <span className="spinner-login"></span>
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <Icon name="add" size={18} />
            <span>Create Your Account</span>
          </>
        )}
      </button>
    </form>
  )
}

export default function Login(props) {
  const {
    showLoginPage,
    setShowLoginPage,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    handleAuth,
    registerUsername,
    setRegisterUsername,
    registerPassword,
    setRegisterPassword,
    registerEmail,
    setRegisterEmail,
    handleRegister,
    registerError
  } = props

  const currentYear = new Date().getFullYear()

  return (
    <div className="app login-root-new">
      {/* Animated background particles */}
      <div className="login-bg-particles">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      <div className="login-container-new">
        {/* Left side - Branding */}
        <div className="login-branding-section">
          <div className="brand-content">
            <div className="brand-logo-new">
              <Icon name="spark" size={48} />
            </div>
            <h1 className="brand-title-new">26:07 Electronics</h1>
            <p className="brand-subtitle-new">Premium Electronics & Smart Solutions</p>
            
            <div className="brand-features">
              <div className="feature-item">
                <Icon name="check" size={20} />
                <span>Real-time Inventory Management</span>
              </div>
              <div className="feature-item">
                <Icon name="check" size={20} />
                <span>Advanced POS System</span>
              </div>
              <div className="feature-item">
                <Icon name="check" size={20} />
                <span>Comprehensive Analytics</span>
              </div>
              <div className="feature-item">
                <Icon name="check" size={20} />
                <span>Secure & Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login/Register Form */}
        <div className="login-form-section">
          <div className="login-card-new">
            {/* Tab Switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(true)}
                type="button"
              >
                <Icon name="lock" size={18} />
                <span>Login</span>
              </button>
              <button
                className={`auth-tab ${!showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(false)}
                type="button"
              >
                <Icon name="add" size={18} />
                <span>Register</span>
              </button>
            </div>

            {/* Form Content */}
            <div className="auth-form-content">
              {showLoginPage ? (
                <div className="form-section">
                  <div className="form-header">
                    <h2>Welcome Back!</h2>
                    <p>Please login to continue to your account</p>
                  </div>
                  
                  <LoginForm
                    authUsername={authUsername}
                    authPassword={authPassword}
                    setAuthUsername={setAuthUsername}
                    setAuthPassword={setAuthPassword}
                    authError={authError}
                    handleAuth={handleAuth}
                  />

                  <div className="form-notice">
                    <Icon name="lock" size={16} />
                    <span>Admin credentials required for owner access</span>
                  </div>
                </div>
              ) : (
                <div className="form-section">
                  <div className="form-header">
                    <h2>Create Account</h2>
                    <p>Sign up to start managing your inventory</p>
                  </div>
                  
                  <RegisterForm
                    registerUsername={registerUsername}
                    registerPassword={registerPassword}
                    registerEmail={registerEmail}
                    setRegisterUsername={setRegisterUsername}
                    setRegisterPassword={setRegisterPassword}
                    setRegisterEmail={setRegisterEmail}
                    registerError={registerError}
                    handleRegister={handleRegister}
                  />

                  <div className="form-notice">
                    <Icon name="check" size={16} />
                    <span>Admin will review and approve your access</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <p>&copy; {currentYear} 26:07 Electronics. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
