/**
 * Modal Component
 * Reusable modal wrapper with overlay
 */

import React, { useEffect } from 'react'
import PropTypes from 'prop-types'

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium',
  closeOnOverlayClick = true,
  noInternalScroll = false,
  fullScreen = false
}) => {
  // Close on Escape key and optional body scroll lock for fullScreen
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    // Lock body scroll when fullScreen to avoid double scrollbars
    const previousBodyOverflow = document.body.style.overflow
    if (fullScreen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
      if (fullScreen) {
        document.body.style.overflow = previousBodyOverflow
      }
    }
  }, [isOpen, onClose, fullScreen])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    xl: 'modal-xl',
    full: 'max-w-7xl'
  }

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: fullScreen ? 'stretch' : (noInternalScroll ? 'flex-start' : 'center'),
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    overflowY: 'auto'
  }

  const contentStyle = {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxHeight: fullScreen ? '100vh' : (noInternalScroll ? 'none' : '90vh'),
    height: fullScreen ? '100vh' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  const bodyStyle = {
    padding: '24px',
    overflowY: noInternalScroll ? 'visible' : 'auto',
    flex: 1
  }

  const footerStyle = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    ...(noInternalScroll || fullScreen ? { position: 'sticky', bottom: 0, background: '#fff', zIndex: 2 } : {})
  }

  return (
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
      style={overlayStyle}
    >
      <div 
        className={`modal-content ${sizeClasses[size]} ${noInternalScroll ? 'modal-no-internal-scroll' : ''} ${fullScreen ? 'modal-fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={contentStyle}
      >
        {/* Modal Header */}
        {title && (
          <div 
            className="modal-header"
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#6b7280',
                lineHeight: 1,
                padding: '0'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div 
          className="modal-body"
          style={bodyStyle}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div 
            className="modal-footer"
            style={footerStyle}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl', 'full']),
  closeOnOverlayClick: PropTypes.bool,
  noInternalScroll: PropTypes.bool,
  fullScreen: PropTypes.bool
}

export default Modal
