import React from 'react';
import Button from './Button';
import Icon from '../../Icon';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'warning', 'info'
  loading = false
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const variantIcon = {
    danger: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  }[variant] || 'alert-circle';

  const variantColor = {
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  }[variant] || '#ef4444';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <Icon 
            name={variantIcon} 
            size={48} 
            color={variantColor}
            className="confirm-icon"
          />
        </div>
        <div className="confirm-body">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>
        <div className="confirm-footer">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'info' ? 'primary' : variant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
