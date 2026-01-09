import React, { useState } from 'react';
import Icon from '../../Icon';
import TabNavigation from './TabNavigation';

export default function Header({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  isAdmin, 
  userRole,
  onLogout, 
  profilePhoto,
  isOnline,
  offlineCount
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleDisplay = () => {
    if (isAdmin || userRole === 'admin') return '👑 Admin';
    if (userRole === 'manager') return '👔 Manager';
    if (userRole === 'cashier') return '💼 Cashier';
    return '👤 User';
  };

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-left">
          <div className="company-brand">
            <span className="company-logo">⚡</span>
            <div className="company-info">
              <h1 className="company-name">26:07 Electronics</h1>
              <p className="company-tagline">Inventory Management System</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="status-indicators">
            {!isOnline && (
              <div className="offline-indicator" title="You are offline">
                <Icon name="wifi-off" size={18} />
                <span>Offline</span>
                {offlineCount > 0 && (
                  <span className="offline-count">{offlineCount}</span>
                )}
              </div>
            )}
            {isOnline && (
              <div className="online-indicator" title="Connected">
                <Icon name="wifi" size={18} />
              </div>
            )}
          </div>

          <div className="user-menu-container">
            <button 
              className="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  <Icon name="user" size={20} />
                </div>
              )}
              <div className="user-info">
                <span className="user-name">{currentUser?.username || 'User'}</span>
                <span className="user-role">{getRoleDisplay()}</span>
              </div>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-info">
                    <strong>{currentUser?.username}</strong>
                    <span>{getRoleDisplay()}</span>
                  </div>
                </div>
                <div className="user-dropdown-divider"></div>
                <button 
                  className="user-dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Icon name="settings" size={18} />
                  <span>Settings</span>
                </button>
                <button 
                  className="user-dropdown-item logout-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                >
                  <Icon name="log-out" size={18} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} isAdmin={isAdmin} />
    </header>
  );
}
