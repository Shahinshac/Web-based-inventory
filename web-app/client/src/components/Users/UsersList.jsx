import React, { useState } from 'react';
import UserCard from './UserCard';
import CreateUserForm from './CreateUserForm';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import Icon from '../../Icon';
import './Users.css';

export default function UsersList({ 
  users, 
  currentUser,
  onCreateUser,
  onResetPassword,
  onApproveUser,
  onDeleteUser,
  onChangeRole,
  onForceLogout,
  onRevokeAccess,
  onRefreshUsers
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'admin', 'manager', 'cashier'
  const [showCreateForm, setShowCreateForm] = useState(false);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query);

    let matchesFilter = true;
    switch (filter) {
      case 'admin':
        matchesFilter = user.role === 'admin';
        break;
      case 'manager':
        matchesFilter = user.role === 'manager';
        break;
      case 'cashier':
        matchesFilter = user.role === 'cashier';
        break;
      default:
        matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

  const activeUsers = users.filter(u => u.approved !== false);

  return (
    <div className="users-list">
      <div className="users-header">
        <div>
          <h2 className="users-title">👥 User Management</h2>
          <p className="users-subtitle">
            {users.length} total users • {activeUsers.length} active
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          icon={showCreateForm ? "x" : "add"}
        >
          {showCreateForm ? 'Cancel' : 'Create User'}
        </Button>
      </div>

      {showCreateForm && (
        <CreateUserForm 
          onCreateUser={onCreateUser}
          onClose={() => setShowCreateForm(false)}
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
          <option value="admin">👑 Admins</option>
          <option value="manager">👔 Managers</option>
          <option value="cashier">💼 Cashiers</option>
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
              onChangeRole={onChangeRole}
              onForceLogout={onForceLogout}
              onRevokeAccess={onRevokeAccess}
              onResetPassword={onResetPassword}
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
