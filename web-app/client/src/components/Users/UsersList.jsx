import React, { useState } from 'react';
import UserCard from './UserCard';
import CreateUserForm from './CreateUserForm';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import ImageUpload from '../Common/ImageUpload';
import Icon from '../../Icon';
import { normalizePhotoUrl } from '../../utils/api';
import './Users.css';

export default function UsersList({
  users,
  currentUser,
  isAdmin,
  userRole,
  isOnline,
  onCreateUser,
  onResetPassword,
  onApproveUser,
  onDeleteUser,
  onChangeRole,
  onForceLogout,
  onRevokeAccess,
  onRefreshUsers,
  onLogout,
  onUpdateUserPhoto,
  onDeleteUserPhoto
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'admin', 'manager', 'cashier'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const getRoleDisplay = () => {
    if (isAdmin || userRole === 'admin') return '👑 Admin';
    if (userRole === 'manager') return '👔 Manager';
    if (userRole === 'cashier') return '💼 Cashier';
    return '👤 User';
  };

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
      {/* Current User Profile Section */}
      {/* Current User Profile Section */}
      <div className="current-user-profile card">
        <div className="profile-card-header">
          <div className="profile-title-text">
            <h3>My Staff Profile</h3>
            <p>Your authentication status, role privileges, and account settings</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant={showSettings ? "primary" : "secondary"}
              onClick={() => setShowSettings(!showSettings)}
              icon="settings"
            >
              {showSettings ? 'Close Settings' : 'Account Settings'}
            </Button>
            <Button
              variant="secondary"
              onClick={onLogout}
              icon="log-out"
            >
              Logout
            </Button>
          </div>
        </div>

        {showSettings ? (
          <div className="profile-settings-panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', alignItems: 'start' }}>
              {/* Profile Photo Section */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div className="profile-avatar-large" style={{ width: '90px', height: '90px', margin: '0 auto' }}>
                    {currentUser?.photo ? (
                      <img
                        src={normalizePhotoUrl(currentUser.photo)}
                        alt={currentUser.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Icon name="user" size={40} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                </div>
                {onUpdateUserPhoto && (
                  <ImageUpload
                    currentImageUrl={normalizePhotoUrl(currentUser?.photo)}
                    onUpload={onUpdateUserPhoto}
                    onDelete={onDeleteUserPhoto}
                    shape="circle"
                    size={90}
                    label="Update Photo"
                  />
                )}
              </div>

              {/* Profile Info Section */}
              <div className="profile-info-grid">
                <div className="profile-info-item">
                  <div>
                    <span className="info-label">Username</span>
                    <span className="info-value">{currentUser?.username || 'N/A'}</span>
                  </div>
                  <Icon name="user" size={18} style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="profile-info-item">
                  <div>
                    <span className="info-label">Role</span>
                    <span className="info-value">{getRoleDisplay()}</span>
                  </div>
                  <Icon name="shield" size={18} style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="profile-info-item">
                  <div>
                    <span className="info-label">Network Status</span>
                    <span className="info-value">
                      <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </span>
                  </div>
                  <Icon name="wifi" size={18} style={{ color: 'var(--text-muted)' }} />
                </div>

                <div className="profile-info-item">
                  <div>
                    <span className="info-label">System Version</span>
                    <span className="info-value">1.0.0 (Commercial ERP)</span>
                  </div>
                  <Icon name="info" size={18} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="profile-summary-view">
            <div className="profile-avatar-large">
              {currentUser?.photo ? (
                <img
                  src={normalizePhotoUrl(currentUser.photo)}
                  alt={currentUser.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Icon name="user" size={32} style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div className="profile-details" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0 }}>{currentUser?.username || 'User'}</h4>
                <span className="badge badge-primary" style={{ fontSize: '11px' }}>{getRoleDisplay()}</span>
                <span className={`badge ${isOnline ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                  {isOnline ? '● Online' : '○ Offline'}
                </span>
              </div>
              <p style={{ marginTop: '4px', marginBottom: 0 }}>
                Logged in as active staff member with access to system operations
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Management Section */}
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
