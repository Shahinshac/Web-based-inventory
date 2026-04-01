/**
 * @file CustomerProfile.jsx
 * @description Customer profile with editable fields and downloads
 */

import React, { useState, useEffect } from 'react';
import Icon from '../Icon';
import { 
  fetchCustomerProfile, 
  updateCustomerProfile,
  downloadVCard,
  downloadPVCCard
} from '../../services/customerPortalService';

const CustomerProfile = ({ currentUser }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerProfile();
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateCustomerProfile(formData);
      setProfile({ ...profile, ...formData });
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      phone: profile?.phone || ''
    });
    setEditing(false);
  };

  const handleDownloadVCard = async () => {
    try {
      await downloadVCard();
    } catch (err) {
      alert('Failed to download vCard: ' + err.message);
    }
  };

  const handleDownloadPVCCard = async () => {
    try {
      await downloadPVCCard();
    } catch (err) {
      alert('Failed to download membership card: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        <Icon name="alert-circle" size={20} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="customer-profile">
      {/* Profile Card */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="user" size={24} />
            My Profile
          </h2>
          {!editing && (
            <button
              className="btn-primary"
              onClick={() => setEditing(true)}
            >
              <Icon name="edit" size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600',
                  color: '#4a5568'
                }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600',
                  color: '#4a5568'
                }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem'
                  }}
                />
                <small style={{ color: '#718096', fontSize: '0.875rem' }}>
                  10-digit mobile number
                </small>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '600',
                  color: '#4a5568'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    background: '#f7fafc',
                    color: '#a0aec0'
                  }}
                />
                <small style={{ color: '#718096', fontSize: '0.875rem' }}>
                  Email cannot be changed
                </small>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  disabled={saving}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#718096',
                marginBottom: '0.25rem'
              }}>
                Full Name
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#2d3748'
              }}>
                {profile?.name || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#718096',
                marginBottom: '0.25rem'
              }}>
                Email Address
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#2d3748'
              }}>
                {profile?.email || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#718096',
                marginBottom: '0.25rem'
              }}>
                Phone Number
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#2d3748'
              }}>
                {profile?.phone || 'N/A'}
              </div>
            </div>

            <div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: '#718096',
                marginBottom: '0.25rem'
              }}>
                Account Type
              </div>
              <div>
                <span className="badge badge-info">
                  {profile?.role || 'Customer'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Downloads Card */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="download" size={24} />
            Downloads
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            className="btn-secondary"
            onClick={handleDownloadVCard}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <Icon name="credit-card" size={20} />
            <span>Download Business Contact (vCard)</span>
          </button>
          <button
            className="btn-secondary"
            onClick={handleDownloadPVCCard}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <Icon name="id-card" size={20} />
            <span>Download Membership Card (PDF)</span>
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="portal-card" style={{ background: '#f7fafc' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Icon name="lock" size={24} color="#667eea" />
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Security Note
            </h3>
            <p style={{ color: '#718096', fontSize: '0.875rem', lineHeight: '1.6' }}>
              This portal uses password-based authentication. Your email address is used as your 
              login identifier and cannot be changed. If you need to update your email, please 
              contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
