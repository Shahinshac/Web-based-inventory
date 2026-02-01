import React, { useState } from 'react';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function UserApproval({ pendingUsers, onApprove, onReject }) {
  const [selectedRoles, setSelectedRoles] = useState({});

  if (pendingUsers.length === 0) return null;

  const handleRoleChange = (userId, role) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: role }));
  };

  const handleApprove = (userId) => {
    const role = selectedRoles[userId] || 'cashier';
    onApprove(userId, role);
  };

  return (
    <div className="user-approval-section">
      <div className="approval-header">
        <div className="approval-icon-wrapper">
          <Icon name="alert-circle" size={24} />
        </div>
        <div className="approval-header-text">
          <h3>Pending User Approvals</h3>
          <span className="approval-count">{pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} waiting</span>
        </div>
      </div>

      <div className="approval-list">
        {pendingUsers.map(user => {
          const userId = user.id || user._id;
          const selectedRole = selectedRoles[userId] || 'cashier';
          
          return (
            <div key={userId} className="approval-item">
              <div className="approval-user-info">
                <div className="approval-avatar">
                  <Icon name="user" size={24} />
                </div>
                <div className="approval-user-details">
                  <strong>{user.username}</strong>
                  <span className="approval-email">{user.email}</span>
                </div>
              </div>

              <div className="approval-role-select">
                <label htmlFor={`role-${userId}`}>
                  <Icon name="shield" size={14} />
                  Assign Role
                </label>
                <select 
                  id={`role-${userId}`}
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(userId, e.target.value)}
                  className="role-dropdown"
                >
                  <option value="cashier">💼 Cashier</option>
                  <option value="manager">👔 Manager</option>
                  <option value="admin">👑 Admin</option>
                </select>
              </div>

              <div className="approval-actions">
                <Button
                  variant="success"
                  size="small"
                  onClick={() => handleApprove(userId)}
                  icon="check"
                >
                  Approve as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                </Button>

                <Button
                  variant="danger"
                  size="small"
                  onClick={() => onReject(userId)}
                  icon="x"
                >
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
