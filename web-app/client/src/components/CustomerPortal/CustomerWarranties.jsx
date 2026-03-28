/**
 * @file CustomerWarranties.jsx
 * @description Display customer's product warranties and expiry information
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet } from '../../utils/api';

const CustomerWarranties = ({ currentUser }) => {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filteredWarranties, setFilteredWarranties] = useState([]);

  useEffect(() => {
    const fetchWarranties = async () => {
      try {
        setLoading(true);
        const response = await apiGet('/api/customer/warranties');
        setWarranties(response.warranties || []);
        setFilteredWarranties(response.warranties || []);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch warranties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWarranties();
  }, []);

  useEffect(() => {
    let filtered = warranties;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }

    setFilteredWarranties(filtered);
  }, [warranties, filterStatus]);

  const getWarrantyStatus = (warranty) => {
    const now = new Date();
    const expiryDate = new Date(warranty.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 30) return 'expiring-soon';
    return 'active';
  };

  const getStatusBadge = (warranty) => {
    const status = getWarrantyStatus(warranty);
    const badges = {
      'active': { label: 'Active', icon: 'check-circle', color: 'green' },
      'expiring-soon': { label: 'Expiring Soon', icon: 'alert-circle', color: 'orange' },
      'expired': { label: 'Expired', icon: 'x-circle', color: 'red' }
    };
    return badges[status] || badges['active'];
  };

  if (error) {
    return (
      <div className="portal-section">
        <div className="error-state">
          <Icon name="alert" size={32} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <div className="section-header">
        <h2>My Warranties</h2>
        <p>Track your product warranties and expiries</p>
      </div>

      {/* Filter */}
      <div className="filters-bar">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Warranties</option>
          <option value="active">Active</option>
          <option value="expiring-soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Warranties List */}
      {loading ? (
        <div className="loading-state">
          <p>Loading your warranties...</p>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="empty-state">
          <Icon name="shield" size={48} />
          <p>No warranties found</p>
          <span>You haven't registered any warranties yet</span>
        </div>
      ) : (
        <div className="warranties-grid">
          {filteredWarranties.map(warranty => {
            const badge = getStatusBadge(warranty);
            const daysRemaining = Math.ceil(
              (new Date(warranty.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={warranty._id} className="warranty-card">
                <div className="warranty-header">
                  <h3 className="product-name">{warranty.productName}</h3>
                  <span className={`status-badge ${badge.color}`}>
                    <Icon name={badge.icon} size={14} />
                    {badge.label}
                  </span>
                </div>

                <div className="warranty-details">
                  <div className="detail-row">
                    <span className="label">Warranty Type</span>
                    <span className="value">{warranty.warrantyType || 'Standard'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Duration</span>
                    <span className="value">{warranty.durationMonths} months</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Purchase Date</span>
                    <span className="value">
                      {new Date(warranty.purchaseDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expiry Date</span>
                    <span className="value">
                      {new Date(warranty.expiryDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  {warranty.serialNumber && (
                    <div className="detail-row">
                      <span className="label">Serial Number</span>
                      <span className="value mono">{warranty.serialNumber}</span>
                    </div>
                  )}
                </div>

                {daysRemaining > 0 && (
                  <div className="warranty-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.max(0, Math.min(100, (daysRemaining / warranty.durationMonths / 30) * 100))}%`,
                          backgroundColor: badge.color === 'green' ? '#10b981' : badge.color === 'orange' ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <p className="days-remaining">
                      {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Warranty expired'}
                    </p>
                  </div>
                )}

                <div className="warranty-actions">
                  {warranty.status !== 'expired' && (
                    <button className="action-btn">Renew Warranty</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerWarranties;
