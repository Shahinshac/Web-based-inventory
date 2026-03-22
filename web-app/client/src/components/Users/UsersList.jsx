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
      <div className="current-user-profile" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h3 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              My Profile
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              Manage your account settings and profile
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              variant={showSettings ? "primary" : "secondary"}
              onClick={() => setShowSettings(!showSettings)}
              icon="settings"
              style={{
                background: showSettings ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                border: 'none',
                color: 'white'
              }}
            >
              {showSettings ? 'Close Settings' : 'Settings'}
            </Button>
            <Button
              variant="secondary"
              onClick={onLogout}
              icon="log-out"
              style={{
                background: 'rgba(239,68,68,0.2)',
                border: 'none',
                color: 'white'
              }}
            >
              Logout
            </Button>
          </div>
        </div>

        {showSettings ? (
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
              {/* Profile Photo Section */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    overflow: 'hidden',
                    border: '4px solid rgba(255,255,255,0.3)'
                  }}>
                    {currentUser?.photo ? (
                      <img
                        src={normalizePhotoUrl(currentUser.photo)}
                        alt={currentUser.username}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Icon name="user" size={48} style={{ color: 'white' }} />
                    )}
                  </div>
                </div>
                {onUpdateUserPhoto && (
                  <div>
                    <ImageUpload
                      currentImageUrl={normalizePhotoUrl(currentUser?.photo)}
                      onUpload={onUpdateUserPhoto}
                      onDelete={onDeleteUserPhoto}
                      shape="circle"
                      size={120}
                      label="Update Photo"
                    />
                  </div>
                )}
              </div>

              {/* Profile Info Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Username</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{currentUser?.username || 'N/A'}</span>
                  </div>
                  <Icon name="user" size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Role</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{getRoleDisplay()}</span>
                  </div>
                  <Icon name="shield" size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Status</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
                  </div>
                  <Icon name="wifi" size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>App Version</span>
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>1.0.0</span>
                  </div>
                  <Icon name="info" size={20} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid rgba(255,255,255,0.3)',
              flexShrink: 0
            }}>
              {currentUser?.photo ? (
                <img
                  src={normalizePhotoUrl(currentUser.photo)}
                  alt={currentUser.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <Icon name="user" size={36} style={{ color: 'white' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>
                {currentUser?.username || 'User'}
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '8px' }}>
                {getRoleDisplay()}
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  color: 'white',
                  fontWeight: '500'
                }}>
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
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
