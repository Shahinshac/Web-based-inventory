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
    </div>
  );
};

export default CustomerProfile;
