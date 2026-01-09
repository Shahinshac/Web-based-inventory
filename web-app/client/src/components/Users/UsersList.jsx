import React, { useState } from 'react';
import UserCard from './UserCard';
import UserApproval from './UserApproval';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function UsersList({ 
  users, 
  currentUser,
  onApproveUser,
  onDeleteUser,
  onForceLogout,
  onRevokeAccess
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query);

    let matchesFilter = true;
    switch (filter) {
      case 'pending':
        matchesFilter = !user.approved;
        break;
      case 'approved':
        matchesFilter = user.approved;
        break;
      default:
        matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  return (
    <div className="users-list">
      <div className="users-header">
        <div>
          <h2 className="users-title">👥 User Management</h2>
          <p className="users-subtitle">
            {users.length} total users • {pendingUsers.length} pending • {approvedUsers.length} approved
          </p>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <UserApproval 
          pendingUsers={pendingUsers}
          onApprove={onApproveUser}
          onReject={onDeleteUser}
        />
      )}

      <div className="users-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by username, email, or role..."
        />

        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Users</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending Approval</option>
        </select>
      </div>

      <div className="users-grid">
        {filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <UserCard 
              key={user.id || user._id}
              user={user}
              currentUser={currentUser}
              onDelete={onDeleteUser}
              onForceLogout={onForceLogout}
              onRevokeAccess={onRevokeAccess}
            />
          ))
        ) : (
          <div className="empty-state">
            <Icon name="users" size={64} color="#cbd5e1" />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
