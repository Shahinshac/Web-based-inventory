import React, { useState } from 'react';
import RoleSelector from './RoleSelector';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import { normalizePhotoUrl } from '../../utils/api';

export default function UserCard({ 
  user, 
  currentUser,
  onDelete,
  onForceLogout,
  onRevokeAccess,
  onResetPassword
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const isCurrentUser = currentUser?.id === user.id || currentUser?._id === user._id;

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'manager': return '👔';
      case 'cashier': return '💼';
      default: return '👤';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'manager': return '#3b82f6';
      case 'cashier': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <div className={`user-card ${!user.approved ? 'pending' : ''} ${isCurrentUser ? 'current-user' : ''}`}>
        <div className="user-card-header">
          <div className="user-avatar-section">
            <div className="user-avatar">
              {user.photo ? (
                <img
                  src={normalizePhotoUrl(user.photo)}
                  alt={user.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                />
              ) : null}
              <span style={{ display: user.photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <Icon name="user" size={32} />
              </span>
            </div>
          </div>
          <div className="user-info">
            <h3 className="user-name">
              {user.username}
              {isCurrentUser && <span className="current-badge">You</span>}
            </h3>
            <p className="user-email">{user.email || 'No email'}</p>
          </div>
        </div>

        <div className="user-card-body">
          <RoleSelector role={user.role} readOnly />

          <div className="user-status">
            {user.approved !== false ? (
              <span className="badge badge-success">
                <Icon name="check-circle" size={14} />
                Active
              </span>
            ) : (
              <span className="badge badge-warning">
                <Icon name="clock" size={14} />
                Disabled
              </span>
            )}
          </div>

          {user.lastLogin && (
            <div className="user-last-login">
              <Icon name="clock" size={14} />
              <span>Last login: {new Date(user.lastLogin).toLocaleString()}</span>
            </div>
          )}
        </div>

        {showResetPassword && !isCurrentUser && (
          <div className="reset-password-section">
            <div className="reset-password-form">
              <label>New Password</label>
              <div className="reset-password-input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  minLength="6"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <Icon name={showNewPassword ? "lock" : "eye"} size={14} />
                </button>
              </div>
              <div className="reset-password-actions">
                <Button
                  variant="primary"
                  size="small"
                  onClick={async () => {
                    if (newPassword.length >= 6) {
                      const result = await onResetPassword(user.id || user._id, newPassword);
                      if (result?.success) {
                        setNewPassword('');
                        setShowResetPassword(false);
                      }
                    }
                  }}
                  disabled={newPassword.length < 6}
                  icon="check"
                >
                  Set Password
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => { setShowResetPassword(false); setNewPassword(''); }}
                  icon="x"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isCurrentUser && (
          <div className="user-card-actions">
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowResetPassword(!showResetPassword)}
              icon="lock"
            >
              {showResetPassword ? 'Cancel' : 'Reset Password'}
            </Button>

            {user.approved !== false && (
              <Button
                variant="warning"
                size="small"
                onClick={() => setShowRevokeConfirm(true)}
                icon="user-x"
              >
                Disable
              </Button>
            )}

            <Button
              variant="secondary"
              size="small"
              onClick={() => onForceLogout(user.username)}
              icon="log-out"
            >
              Force Logout
            </Button>

            <Button
              variant="danger"
              size="small"
              onClick={() => setShowDeleteConfirm(true)}
              icon="trash-2"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(user.id || user._id);
          setShowDeleteConfirm(false);
        }}
        title="Delete User"
        message={`Are you sure you want to delete user "${user.username}"? They will be immediately logged out.`}
        confirmText="Delete"
        variant="danger"
      />

      <ConfirmDialog 
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={() => {
          onRevokeAccess(user.id || user._id, user.username);
          setShowRevokeConfirm(false);
        }}
        title="Disable User"
        message={`Are you sure you want to disable access for "${user.username}"? They will not be able to login.`}
        confirmText="Disable"
        variant="warning"
      />
    </>
  );
}
