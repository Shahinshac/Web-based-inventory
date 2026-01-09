/**
 * Button Component
 * Reusable button with variants and states
 */

import React from 'react'
import PropTypes from 'prop-types'

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  icon,
  className = ''
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all 0.2s',
    width: fullWidth ? '100%' : 'auto'
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
    },
    secondary: {
      background: '#f3f4f6',
      color: '#374151',
      border: '1px solid #e5e7eb'
    },
    success: {
      background: '#10b981',
      color: 'white',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
    },
    danger: {
      background: '#ef4444',
      color: 'white',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
    },
    warning: {
      background: '#f59e0b',
      color: 'white',
      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
    },
    outline: {
      background: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea'
    }
  }

  const sizes = {
    small: {
      padding: '6px 12px',
      fontSize: '13px'
    },
    medium: {
      padding: '10px 20px',
      fontSize: '14px'
    },
    large: {
      padding: '14px 28px',
      fontSize: '16px'
    }
  }

  const buttonStyles = {
    ...baseStyles,
    ...variants[variant],
    ...sizes[size]
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn btn-${variant} btn-${size} ${className}`}
      style={buttonStyles}
    >
      {loading && (
        <span 
          className="spinner"
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
      )}
      {icon && !loading && <span>{icon}</span>}
      {children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  icon: PropTypes.node,
  className: PropTypes.string
}

export default Button
