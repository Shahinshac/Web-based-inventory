import React, { useState } from 'react';
import Icon from '../../Icon';
import TabNavigation from './TabNavigation';
import ImageUpload from '../Common/ImageUpload';
import { normalizePhotoUrl } from '../../utils/api';

export default function Header({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  isAdmin, 
  userRole,
  onLogout, 
  onUpdateUserPhoto,
  onDeleteUserPhoto,
  isOnline,
  offlineCount
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
              <div className="user-avatar-placeholder">
                {currentUser?.photo
                  ? (
                    <img
                      src={normalizePhotoUrl(currentUser.photo)}
                      alt={currentUser.username}
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                <span style={{ display: currentUser?.photo ? 'none' : 'flex' }}>
                  <Icon name="user" size={20} />
                </span>
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser?.username || 'User'}</span>
                <span className="user-role">{getRoleDisplay()}</span>
              </div>
              <Icon name="chevron-down" size={16} />
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="user-dropdown-backdrop" 
                  onClick={() => { setShowUserMenu(false); setShowSettings(false); }}
                />
                <div className="user-dropdown">
                  {!showSettings ? (
                    <div className="user-dropdown-content">
                      <div className="user-dropdown-header">
                        <div className="user-dropdown-avatar-section">
                          <div className="user-dropdown-avatar">
                            {currentUser?.photo
                              ? (
                                <img
                                  src={normalizePhotoUrl(currentUser.photo)}
                                  alt={currentUser.username}
                                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )
                              : <Icon name="user" size={32} />
                            }
                          </div>
                        </div>
                        <div className="user-dropdown-info">
                          <strong>{currentUser?.username}</strong>
                          <span>{getRoleDisplay()}</span>
                        </div>
                      </div>
                      
                      <div className="user-dropdown-menu-section">
                        <button className="user-dropdown-item" onClick={() => setShowSettings(true)}>
                          <Icon name="settings" size={18} />
                          <span>Settings</span>
                        </button>
                        
                        <div className="user-dropdown-divider"></div>
                        
                        <button 
                          className="user-dropdown-item logout-item"
                          onClick={() => { setShowUserMenu(false); onLogout(); }}
                        >
                          <Icon name="log-out" size={18} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="settings-panel">
                      <div className="settings-panel-header">
                        <button className="settings-back-btn" onClick={() => setShowSettings(false)}>
                          <Icon name="arrow-left" size={18} />
                        </button>
                        <h3>Settings</h3>
                      </div>
                      <div className="settings-panel-body">
                        <div className="settings-section">
                          <h4><Icon name="user" size={16} /> Profile</h4>

                          {/* Profile photo upload */}
                          {onUpdateUserPhoto && (
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                              <ImageUpload
                                currentImageUrl={normalizePhotoUrl(currentUser?.photo)}
                                onUpload={onUpdateUserPhoto}
                                onDelete={onDeleteUserPhoto}
                                shape="circle"
                                size={80}
                                label="Update photo"
                              />
                            </div>
                          )}

                          <div className="settings-info-row">
                            <span className="settings-label">Username</span>
                            <span className="settings-value">{currentUser?.username || 'N/A'}</span>
                          </div>
                          <div className="settings-info-row">
                            <span className="settings-label">Role</span>
                            <span className="settings-value">{getRoleDisplay()}</span>
                          </div>
                        </div>
                        <div className="settings-section">
                          <h4><Icon name="info" size={16} /> App Info</h4>
                          <div className="settings-info-row">
                            <span className="settings-label">Version</span>
                            <span className="settings-value">1.0.0</span>
                          </div>
                          <div className="settings-info-row">
                            <span className="settings-label">Status</span>
                            <span className="settings-value">{isOnline ? '🟢 Online' : '🔴 Offline'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} isAdmin={isAdmin} userRole={userRole} />
    </header>
  );
}
