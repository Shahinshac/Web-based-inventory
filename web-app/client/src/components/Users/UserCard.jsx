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
  onRevokeAccess
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

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
          <div className="user-avatar">
            {user.photo ? (
              <img 
                src={normalizePhotoUrl(user.photo)} 
                alt={user.username}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Icon name="user" size={32} />
            )}
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
            {user.approved ? (
              <span className="badge badge-success">
                <Icon name="check-circle" size={14} />
                Approved
              </span>
            ) : (
              <span className="badge badge-warning">
                <Icon name="clock" size={14} />
                Pending Approval
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

        {!isCurrentUser && user.approved && (
          <div className="user-card-actions">
            <Button
              variant="warning"
              size="small"
              onClick={() => setShowRevokeConfirm(true)}
              icon="user-x"
            >
              Revoke Access
            </Button>

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
        title="Revoke Access"
        message={`Are you sure you want to revoke access for "${user.username}"? They will need admin approval again.`}
        confirmText="Revoke"
        variant="warning"
      />
    </>
  );
}
