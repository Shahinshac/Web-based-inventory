import React, { useState, useEffect } from 'react'
import Icon from './Icon.jsx'

export default function Login(props) {
  console.log('🔐 Login component rendering...', props)
  
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

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

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
      } catch (e) {}
    } else if (!rememberMe) {
      try {
        localStorage.removeItem('rememberedUser')
      } catch (e) {}
    }
  }, [rememberMe, authUsername])

  const onLoginSubmit = async (e) => {
    e.preventDefault()
    if (!authUsername || !authPassword) return
    setLoading(true)
    try {
      await handleAuth()
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!registerUsername || !registerEmail || !registerPassword) return
    setLoading(true)
    try {
      await handleRegister()
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()

  console.log('🎨 Login component about to render JSX', { showLoginPage, authError, registerError })

  return (
    <div className="login-page">
      <div className="login-wrapper">
        {/* Branding Side */}
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

        {/* Form Side */}
        <div className="login-form-side">
          <div className="login-box">
            {/* Tabs */}
            <div className="login-tabs">
              <button
                type="button"
                className={`login-tab ${showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(true)}
              >
                <Icon name="lock" size={16} />
                Login
              </button>
              <button
                type="button"
                className={`login-tab ${!showLoginPage ? 'active' : ''}`}
                onClick={() => setShowLoginPage(false)}
              >
                <Icon name="add" size={16} />
                Register
              </button>
            </div>

            {/* Login Form */}
            {showLoginPage ? (
              <div className="login-content">
                <div className="login-header">
                  <h2>Welcome Back!</h2>
                  <p>Please login to continue</p>
                </div>

                <form onSubmit={onLoginSubmit} className="login-form">
                  <div className="field">
                    <label>
                      <Icon name="customers" size={14} />
                      Username
                    </label>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Enter username"
                      required
                      autoFocus
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
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon name={showPassword ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>

                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  {authError && (
                    <div className="error-msg">
                      <Icon name="close" size={14} />
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={loading || !authUsername || !authPassword}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="notice">
                  <Icon name="lock" size={14} />
                  <span>Admin credentials required for owner access</span>
                </div>
              </div>
            ) : (
              /* Register Form */
              <div className="login-content">
                <div className="login-header">
                  <h2>Create Account</h2>
                  <p>Sign up to get started</p>
                </div>

                <form onSubmit={onRegisterSubmit} className="login-form">
                  <div className="field">
                    <label>
                      <Icon name="customers" size={14} />
                      Username
                    </label>
                    <input
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      placeholder="Choose username (min 3 chars)"
                      required
                      minLength="3"
                      autoFocus
                    />
                  </div>

                  <div className="field">
                    <label>
                      <Icon name="email" size={14} />
                      Email
                    </label>
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Enter email address"
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
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Create password (min 6 chars)"
                        required
                        minLength="6"
                      />
                      <button
                        type="button"
                        className="eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon name={showPassword ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>

                  {registerError && (
                    <div className="error-msg">
                      <Icon name="close" size={14} />
                      {registerError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="submit-btn register"
                    disabled={loading || !registerUsername || !registerEmail || !registerPassword || registerPassword.length < 6}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </form>

                <div className="notice">
                  <Icon name="check" size={14} />
                  <span>Admin will review and approve your access</span>
                </div>
              </div>
            )}
          </div>

          <div className="login-footer-text">
            &copy; {currentYear} 26:07 Electronics
          </div>
        </div>
      </div>
    </div>
  )
}
