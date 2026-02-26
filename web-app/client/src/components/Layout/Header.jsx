import React, { useState, useRef } from 'react';
import Icon from '../../Icon';
import TabNavigation from './TabNavigation';
import { API, normalizePhotoUrl, getAuthHeaders } from '../../utils/api';

export default function Header({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  isAdmin, 
  userRole,
  onLogout, 
  profilePhoto,
  onPhotoUpdate,
  isOnline,
  offlineCount
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const getRoleDisplay = () => {
    if (isAdmin || userRole === 'admin') return '👑 Admin';
    if (userRole === 'manager') return '👔 Manager';
    if (userRole === 'cashier') return '💼 Cashier';
    return '👤 User';
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const userId = currentUser?.id || currentUser?._id;
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('userId', userId);
      formData.append('username', currentUser?.username);

      const response = await fetch(API(`/api/users/${userId}/photo`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload photo');
      const result = await response.json();
      if (onPhotoUpdate) onPhotoUpdate(result.photo);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadPhoto(file);
  };

  const photoUrl = profilePhoto ? normalizePhotoUrl(profilePhoto) : null;

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
              {photoUrl ? (
                <div className="user-avatar">
                  <img 
                    src={photoUrl} 
                    alt="Profile" 
                  />
                </div>
              ) : (
                <div className="user-avatar-placeholder">
                  <Icon name="user" size={20} />
                </div>
              )}
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
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
                />
                <div className="user-dropdown">
                  {!showSettings ? (
                    <>
                      <div className="user-dropdown-header">
                        <div className="user-dropdown-avatar-section">
                          <div 
                            className={`user-dropdown-avatar ${dragActive ? 'drag-active' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                          >
                            {photoUrl ? (
                              <img src={photoUrl} alt={currentUser?.username} />
                            ) : (
                              <Icon name="user" size={32} />
                            )}
                            {dragActive && (
                              <div className="drag-overlay">
                                <Icon name="upload" size={20} />
                              </div>
                            )}
                          </div>
                          <button 
                            className="user-dropdown-avatar-edit"
                            onClick={handlePhotoClick}
                            title="Change profile photo"
                            disabled={uploadingPhoto}
                          >
                            <Icon name={uploadingPhoto ? "loader" : "camera"} size={14} />
                          </button>
                        </div>
                        <div className="user-dropdown-info">
                          <strong>{currentUser?.username}</strong>
                          <span>{getRoleDisplay()}</span>
                        </div>
                      </div>
                      
                      <div className="user-dropdown-menu-section">
                        {uploadingPhoto && (
                          <div className="photo-upload-loading">
                            <Icon name="loader" size={16} />
                            <span>Uploading photo...</span>
                          </div>
                        )}
                        
                        <button className="user-dropdown-item" onClick={handlePhotoClick} disabled={uploadingPhoto}>
                          <Icon name="camera" size={18} />
                          <span>Change Photo</span>
                        </button>
                        
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
                    </>
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
                        <div className="settings-section">
                          <h4><Icon name="image" size={16} /> Profile Photo</h4>
                          <div
                            className={`photo-drop-zone ${dragActive ? 'active' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handlePhotoClick}
                          >
                            <Icon name="upload-cloud" size={28} />
                            <p>Drag & drop an image here or <strong>click to browse</strong></p>
                            <span className="photo-drop-hint">JPG, PNG or WebP (max 5MB)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Hidden file input for photo upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} isAdmin={isAdmin} userRole={userRole} />
    </header>
  );
}
