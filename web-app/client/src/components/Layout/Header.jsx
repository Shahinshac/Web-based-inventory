import React, { useState, useRef } from 'react';
import Icon from '../../Icon';
import TabNavigation from './TabNavigation';
import { API, normalizePhotoUrl } from '../../utils/api';

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
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
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const result = await response.json();
      
      // Update the photo in parent state
      if (onPhotoUpdate) {
        onPhotoUpdate(result.photo);
      }
      
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
                <img 
                  src={photoUrl} 
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
              <Icon name="chevron-down" size={16} />
            </button>

            {showUserMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div 
                  className="user-dropdown-backdrop" 
                  onClick={() => setShowUserMenu(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99998
                  }}
                />
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar-section">
                      <div className="user-dropdown-avatar">
                        {photoUrl ? (
                          <img src={photoUrl} alt={currentUser?.username} />
                        ) : (
                          <Icon name="user" size={32} />
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
                    
                    <button 
                      className="user-dropdown-item upload-item"
                      onClick={handlePhotoClick}
                      disabled={uploadingPhoto}
                    >
                      <Icon name="camera" size={18} />
                      <span>Change Photo</span>
                    </button>
                    
                    <button 
                      className="user-dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Icon name="settings" size={18} />
                      <span>Settings</span>
                    </button>
                    
                    <div className="user-dropdown-divider"></div>
                    
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

      <TabNavigation activeTab={activeTab} onTabChange={onTabChange} isAdmin={isAdmin} />
    </header>
  );
}
