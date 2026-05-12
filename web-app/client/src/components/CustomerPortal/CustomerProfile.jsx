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
        <div className="portal-card">
          <div className="portal-card-header">
            <h2 className="portal-card-title">
              <Icon name="user" size={20} />
              Account Information
            </h2>
            {!editing && (
              <button className="logout-btn" style={{ background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', padding: '0.4rem 1rem' }} onClick={() => setEditing(true)}>
                <Icon name="edit-3" size={14} />
                Edit Profile
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '16px' }}>
            <div style={{ width: '64px', height: '64px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 800 }}>
              <span style={{ margin: 'auto' }}>{profile?.name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{profile?.name || 'User'}</h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{profile?.role || 'Premium Member'}</span>
            </div>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="logout-btn" style={{ background: '#6366f1', color: 'white', border: 'none' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="logout-btn" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#eff6ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                  <Icon name="mail" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Email Address</div>
                  <div style={{ fontWeight: 600 }}>{profile?.email || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                  <Icon name="phone" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Phone Number</div>
                  <div style={{ fontWeight: 600 }}>{profile?.phone || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="side-column" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="portal-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Downloads</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button className="logout-btn" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={downloadVCard}>
                <Icon name="credit-card" size={20} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>Save to Contacts</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Download vCard</div>
                </div>
              </button>
              <button className="logout-btn" style={{ justifyContent: 'flex-start', padding: '1rem' }} onClick={downloadPVCCard}>
                <Icon name="id-card" size={20} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700 }}>Membership Card</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Download ID PDF</div>
                </div>
              </button>
            </div>
          </div>
          <div className="portal-card" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#166534', marginBottom: '0.5rem' }}>
              <Icon name="shield" size={18} />
              <span style={{ fontWeight: 700 }}>Secure Account</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#166534', opacity: 0.8 }}>Your data is encrypted and protected. Primary email identifiers are verified and secure.</p>
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
