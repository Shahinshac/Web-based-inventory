/**
 * Notification/Toast Component
 * Displays temporary notification messages
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import PropTypes from 'prop-types'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null)

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const hideNotification = useCallback(() => {
    setNotification(null)
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      {notification && (
        <Toast 
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
    </NotificationContext.Provider>
  )
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
}

const Toast = ({ message, type, onClose }) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✓'
      case 'error': return '✕'
      case 'warning': return '⚠'
      case 'info': return 'ℹ'
      default: return 'ℹ'
    }
  }

  return (
    <div 
      className={`notification ${type} slide-in`}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        background: type === 'success' ? '#10b981' : 
                   type === 'error' ? '#ef4444' : 
                   type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <span className="notification-icon" style={{ fontSize: '20px' }}>
        {getIcon()}
      </span>
      <span className="notification-message" style={{ flex: 1 }}>
        {message}
      </span>
      <button 
        className="notification-close"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  onClose: PropTypes.func.isRequired
}

Toast.defaultProps = {
  type: 'info'
}

export default Toast
