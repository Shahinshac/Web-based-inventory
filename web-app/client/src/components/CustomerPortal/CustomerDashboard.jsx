/**
 * @file CustomerDashboard.jsx
 * @description Ultra-Premium Customer dashboard showing overview stats and recent activity
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchDashboardStats } from '../../services/customerPortalService';
import { formatDateOnlyIST, formatTimestampIST } from '../../utils/dateFormatter';

const CustomerDashboard = ({ currentUser }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const memberSince = stats?.memberSince
    ? formatDateOnlyIST(stats.memberSince)
    : 'N/A';

  return (
    <div className="customer-dashboard">
      {/* Welcome Section */}
      <div className="portal-card" style={{ background: '#ffffff', borderLeft: '4px solid #6366f1' }}>
        <div className="hero-content">
          <h2 className="portal-card-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Welcome back, {currentUser?.name || 'Customer'}
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Track your purchases, manage warranties, and view your EMI plans in one place.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="calendar" size={14} /> Member since {memberSince}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="shield" size={14} /> Verified Account
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
            <Icon name="shopping-bag" size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Purchases</span>
            <span className="stat-value">{stats?.stats?.totalPurchases || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <Icon name="credit-card" size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Spent</span>
            <span className="stat-value">₹{stats?.stats?.totalSpent?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#22c55e' }}>
            <Icon name="shield-check" size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Warranties</span>
            <span className="stat-value">{stats?.stats?.activeWarranties || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#f59e0b' }}>
            <Icon name="clock" size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Expiring Soon</span>
            <span className="stat-value">{stats?.stats?.expiredWarranties || 0}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="portal-card">
        <div className="portal-card-header">
          <h3 className="portal-card-title">
            <Icon name="activity" size={18} />
            Recent Purchases
          </h3>
        </div>
        
        {stats?.recentPurchases && stats.recentPurchases.length > 0 ? (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>#{purchase.invoiceNo}</span>
                    </td>
                    <td>{formatTimestampIST(purchase.date)}</td>
                    <td>{purchase.itemCount} Items</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{purchase.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Icon name="shopping-cart" size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>You haven't made any purchases yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
le>
    </div>
  );
};

export default CustomerDashboard;
