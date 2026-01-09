import React from 'react';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function UserApproval({ pendingUsers, onApprove, onReject }) {
  if (pendingUsers.length === 0) return null;

  return (
    <div className="user-approval-section">
      <div className="approval-header">
        <Icon name="alert-circle" size={24} color="#f59e0b" />
        <h3>Pending User Approvals ({pendingUsers.length})</h3>
      </div>

      <div className="approval-list">
        {pendingUsers.map(user => (
          <div key={user.id || user._id} className="approval-item">
            <div className="approval-user-info">
              <Icon name="user" size={20} />
              <div>
                <strong>{user.username}</strong>
                <span>{user.email}</span>
                <span className="user-role-badge">{user.role || 'cashier'}</span>
              </div>
            </div>

            <div className="approval-actions">
              <Button
                variant="success"
                size="small"
                onClick={() => onApprove(user.id || user._id)}
                icon="check"
              >
                Approve
              </Button>

              <Button
                variant="danger"
                size="small"
                onClick={() => onReject(user.id || user._id)}
                icon="x"
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
