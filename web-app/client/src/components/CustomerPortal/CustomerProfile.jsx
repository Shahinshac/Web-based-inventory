/**
 * @file CustomerProfile.jsx
 * @description Customer profile management with edit capabilities
 */

import React, { useState } from 'react';
import Icon from '../../Icon.jsx';
import { apiPatch } from '../../utils/api';

const CustomerProfile = ({ currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || currentUser?.username || '',
    address: currentUser?.address || '',
    city: currentUser?.city || '',
    pincode: currentUser?.pincode || ''
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiPatch('/api/customer/profile', formData);
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Failed to update profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await apiPatch('/api/customer/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      setSuccessMessage('Password changed successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
      console.error('Failed to change password:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-section">
      {/* Profile Header & Avatar */}
      <div className="profile-header-detailed">
        <div className="profile-avatar-large">
          {currentUser?.name?.charAt(0) || 'C'}
        </div>
        <div className="profile-info-summary">
          <h3>{currentUser?.name || 'Customer'}</h3>
          <p>{currentUser?.email || 'No email provided'}</p>
          <div className="profile-badges">
            <span className="badge-premium">Premium</span>
            <span className="badge-verified">Verified</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <Icon name="alert-circle" size={16} />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <Icon name="check-circle" size={16} />
          {successMessage}
        </div>
      )}

      {/* Profile Information */}
      <div className="profile-section">
        <div className="section-title-bar">
          <h3>Account Information</h3>
          {!isEditing && (
            <button
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              <Icon name="edit" size={16} />
              Edit
            </button>
          )}
        </div>

        <div className="profile-grid">
          <div className="profile-field">
            <label>Full Name</label>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-control"
              />
            ) : (
              <p className="field-value">{formData.name}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Email Address</label>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control"
              />
            ) : (
              <p className="field-value">{formData.email || 'Not provided'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled
                className="form-control"
              />
            ) : (
              <p className="field-value">{formData.phone}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Address</label>
            {isEditing ? (
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Street address"
              />
            ) : (
              <p className="field-value">{formData.address || 'Not provided'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>City</label>
            {isEditing ? (
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="form-control"
                placeholder="City"
              />
            ) : (
              <p className="field-value">{formData.city || 'Not provided'}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Pincode</label>
            {isEditing ? (
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                className="form-control"
                placeholder="6-digit pincode"
                maxLength="6"
              />
            ) : (
              <p className="field-value">{formData.pincode || 'Not provided'}</p>
            )}
          </div>

          {isEditing && (
            <div className="profile-field full-width">
              <div style={{gap: '8px', display: 'flex'}}>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="profile-section-card mt-4">
        <h3>Change Password</h3>
        <p className="section-desc-text">Keep your account secure with a strong password</p>
        <div className="profile-grid">
          <div className="profile-field full-width">
            <label>Current Password</label>
            <input
              type="password"
              name="oldPassword"
              value={passwordData.oldPassword}
              onChange={handlePasswordChange}
              className="form-control"
            />
          </div>

          <div className="profile-field full-width">
            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              className="form-control"
            />
          </div>

          <div className="profile-field full-width">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="form-control"
            />
          </div>

          <div className="profile-field full-width">
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={loading || !passwordData.oldPassword || !passwordData.newPassword}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Account Stats */}
      <div className="profile-section-card mt-4">
        <div className="info-grid">
          <div>
            <p className="info-label">Account Created</p>
            <p className="info-value">{new Date(currentUser?.createdAt).toLocaleDateString('en-IN') || 'Jan 2024'}</p>
          </div>
          <div>
            <p className="info-label">Account Status</p>
            <p className="info-value">
              <span className="status-badge green">Active Member</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
