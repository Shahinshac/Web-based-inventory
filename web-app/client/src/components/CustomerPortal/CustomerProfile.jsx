/**
 * @file CustomerProfile.jsx
 * @description Ultra-Premium Customer profile with editable fields and high-end technical styling
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
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
    } catch (err) {
      console.error('Update error:', err);
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

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="customer-profile-view">
      <div className="profile-layout-grid">
        {/* Identity Card Section */}
        <div className="portal-card identity-card-premium">
          <div className="portal-card-header">
            <h2 className="portal-card-title">
              <Icon name="user" size={24} />
              Personal Identity
            </h2>
            {!editing && (
              <button className="edit-btn" onClick={() => setEditing(true)}>
                <Icon name="edit-3" size={16} />
                <span>Modify</span>
              </button>
            )}
          </div>

          <div className="profile-avatar-section">
            <div className="avatar-large">
              {profile?.name?.charAt(0) || 'U'}
              <div className="avatar-glow"></div>
            </div>
            <div className="avatar-meta">
              <h3>{profile?.name || 'User'}</h3>
              <span className="role-badge">{profile?.role || 'Premium Customer'}</span>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} className="premium-form">
              <div className="form-group">
                <label>Display Name</label>
                <div className="input-wrap">
                  <Icon name="user" size={16} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <div className="input-wrap">
                  <Icon name="phone" size={16} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    pattern="[0-9]{10}"
                    maxLength="10"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Syncing...' : 'Save Changes'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-details-list">
              <div className="detail-item">
                <div className="d-icon"><Icon name="mail" size={18} /></div>
                <div className="d-content">
                  <span className="d-label">Email Identifier</span>
                  <span className="d-value">{profile?.email || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-item">
                <div className="d-icon"><Icon name="phone" size={18} /></div>
                <div className="d-content">
                  <span className="d-label">Phone Reference</span>
                  <span className="d-value">{profile?.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-item">
                <div className="d-icon"><Icon name="calendar" size={18} /></div>
                <div className="d-content">
                  <span className="d-label">Account Created</span>
                  <span className="d-value">Verified System User</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Actions Section */}
        <div className="side-column">
          <div className="portal-card digital-assets-card">
            <h3 className="section-subtitle">Digital Assets</h3>
            <div className="asset-buttons">
              <button className="asset-btn" onClick={downloadVCard}>
                <div className="asset-icon pink"><Icon name="credit-card" size={20} /></div>
                <div className="asset-info">
                  <span className="a-title">vCard Contact</span>
                  <span className="a-sub">Add to Phonebook</span>
                </div>
                <Icon name="download" size={16} className="dl-icon" />
              </button>
              
              <button className="asset-btn" onClick={downloadPVCCard}>
                <div className="asset-icon blue"><Icon name="id-card" size={20} /></div>
                <div className="asset-info">
                  <span className="a-title">Identity Card</span>
                  <span className="a-sub">PDF Membership</span>
                </div>
                <Icon name="download" size={16} className="dl-icon" />
              </button>
            </div>
          </div>

          <div className="portal-card security-card">
            <div className="security-header">
              <Icon name="shield-lock" size={24} color="#10b981" />
              <h4>Security Protocol</h4>
            </div>
            <p>Your account is protected with end-to-end encryption. Primary email identifiers are fixed for system integrity.</p>
            <div className="security-status">
              <div className="s-dot"></div>
              <span>System Status: Optimal</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-layout-grid {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
          animation: fadeIn 0.5s ease-out;
        }
        
        .identity-card-premium { border-top: 4px solid var(--portal-accent); }
        
        .edit-btn {
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .edit-btn:hover { background: var(--portal-accent); border-color: var(--portal-accent); }
        
        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 24px;
          margin-bottom: 2.5rem;
        }
        
        .avatar-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--portal-accent), var(--portal-secondary));
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          position: relative;
        }
        
        .avatar-glow {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: inherit;
          filter: blur(20px);
          opacity: 0.4;
          z-index: -1;
        }
        
        .avatar-meta h3 { font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.25rem; }
        .role-badge { 
          font-size: 0.75rem; 
          font-weight: 800; 
          color: var(--portal-accent); 
          text-transform: uppercase; 
          letter-spacing: 0.1em;
        }
        
        .premium-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-group label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; margin-bottom: 0.5rem; }
        
        .input-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--portal-border);
          border-radius: 12px;
          padding: 0.8rem 1.2rem;
          transition: all 0.3s;
        }
        
        .input-wrap:focus-within { border-color: var(--portal-accent); background: rgba(255, 255, 255, 0.08); box-shadow: 0 0 15px var(--portal-accent-glow); }
        .input-wrap input { background: transparent; border: none; color: white; width: 100%; font-size: 1rem; font-weight: 600; outline: none; }
        
        .form-actions { display: flex; gap: 1rem; margin-top: 1rem; }
        
        .profile-details-list { display: flex; flex-direction: column; gap: 2rem; }
        .detail-item { display: flex; align-items: center; gap: 1.5rem; }
        .d-icon { width: 44px; height: 44px; background: var(--portal-glass); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--portal-accent); }
        .d-content { display: flex; flex-direction: column; }
        .d-label { font-size: 0.75rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
        .d-value { font-size: 1.1rem; font-weight: 700; color: white; }
        
        .section-subtitle { font-size: 1.1rem; font-weight: 800; color: white; margin-bottom: 1.5rem; }
        .asset-buttons { display: flex; flex-direction: column; gap: 1rem; }
        
        .asset-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          padding: 1rem;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s;
          text-align: left;
        }
        
        .asset-btn:hover { background: rgba(255, 255, 255, 0.08); border-color: white; transform: translateY(-3px); }
        
        .asset-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .asset-icon.pink { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
        .asset-icon.blue { background: rgba(99, 102, 241, 0.1); color: #818cf8; }
        
        .asset-info { display: flex; flex-direction: column; flex: 1; }
        .a-title { font-weight: 700; color: white; }
        .a-sub { font-size: 0.75rem; color: var(--portal-text-dim); }
        .dl-icon { color: var(--portal-text-dim); opacity: 0.5; }
        
        .security-card { background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%); }
        .security-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .security-header h4 { font-size: 1rem; font-weight: 800; color: white; }
        .security-card p { font-size: 0.85rem; color: var(--portal-text-dim); line-height: 1.6; margin-bottom: 1.5rem; }
        
        .security-status { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; font-weight: 700; color: #10b981; }
        .s-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; }

        @media (max-width: 1000px) {
          .profile-layout-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default CustomerProfile;
