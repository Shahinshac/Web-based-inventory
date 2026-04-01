/**
 * @file CustomerDashboard.jsx
 * @description Customer dashboard showing overview stats and recent activity
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchDashboardStats } from '../../services/customerPortalService';

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

  if (error) {
    return (
      <div className="error-message">
        <Icon name="alert-circle" size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const memberSince = stats?.memberSince 
    ? new Date(stats.memberSince).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'N/A';

  return (
    <div className="customer-dashboard">
      {/* Welcome Section */}
      <div className="portal-card">
        <h2 className="portal-card-title">
          <Icon name="smile" size={24} />
          Welcome back, {currentUser?.name || 'Customer'}!
        </h2>
        <p style={{ color: '#718096', marginTop: '0.5rem' }}>
          Member since {memberSince}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#bee3f8' }}>
            <Icon name="shopping-bag" size={24} color="#2c5282" />
          </div>
          <div className="stat-label">Total Purchases</div>
          <div className="stat-value">{stats?.stats?.totalPurchases || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#c6f6d5' }}>
            <Icon name="dollar-sign" size={24} color="#22543d" />
          </div>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">₹{stats?.stats?.totalSpent?.toLocaleString() || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#feebc8' }}>
            <Icon name="shield" size={24} color="#7c2d12" />
          </div>
          <div className="stat-label">Active Warranties</div>
          <div className="stat-value">{stats?.stats?.activeWarranties || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fed7d7' }}>
            <Icon name="shield" size={24} color="#742a2a" />
          </div>
          <div className="stat-label">Expired Warranties</div>
          <div className="stat-value">{stats?.stats?.expiredWarranties || 0}</div>
        </div>
      </div>

      {/* Recent Purchases */}
      {stats?.recentPurchases && stats.recentPurchases.length > 0 && (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 className="portal-card-title">
              <Icon name="clock" size={20} />
              Recent Purchases
            </h3>
          </div>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td><strong>{purchase.invoiceNo}</strong></td>
                  <td>
                    {new Date(purchase.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td>{purchase.itemCount} items</td>
                  <td><strong>₹{purchase.total.toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {(!stats?.recentPurchases || stats.recentPurchases.length === 0) && (
        <div className="portal-card">
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No purchases yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;
