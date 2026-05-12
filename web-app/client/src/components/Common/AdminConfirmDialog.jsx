import React, { useState } from 'react';
import Modal from './Modal';
import Icon from '../../Icon';
import './ConfirmDialog.css'; // Reuse existing styles if possible or add custom ones

export default function AdminConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Deletion', 
  message = 'Are you sure you want to delete this? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDeleting = false
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!password) {
      setError('Admin password is required to perform this action.');
      return;
    }
    onConfirm(password);
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      size="sm"
    >
      <div className="confirm-dialog-content">
        <div className="warning-header">
          <Icon name="alert-triangle" size={24} style={{ color: '#ef4444' }} />
          <p>{message}</p>
        </div>

        <div className="password-section" style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            Enter Admin Password to Confirm:
          </label>
          <input
            type="password"
            className="confirm-password-input"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <p className="error-text" style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px' }}>
              {error}
            </p>
          )}
        </div>

        <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button 
            className="btn-cancel" 
            onClick={handleCancel}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button 
            className="btn-confirm-delete" 
            onClick={handleConfirm}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isDeleting ? (
              <>
                <Icon name="loader" size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
