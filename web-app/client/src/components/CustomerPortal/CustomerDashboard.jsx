/**
 * @file CustomerDashboard.jsx
 * @description Customer dashboard showing purchase summary and recent activities
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet } from '../../utils/api';

const CustomerDashboard = ({ currentUser, stats: incomingStats, loading, error }) => {
  // Mapping stats from props (Backend returns { stats: { ... }, memberSince: ... })
  const stats = {
    invoiceCount: incomingStats?.stats?.totalPurchases || 0,
    totalSpent: incomingStats?.stats?.totalSpent || 0,
    warrantyCount: incomingStats?.stats?.activeWarranties || 0,
    expiringWarranties: incomingStats?.stats?.expiredWarranties || 0,
    memberSince: incomingStats?.memberSince || new Date().toISOString()
  };

  const StatCard = ({ icon, label, value, trend }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon name={icon} size={24} />
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {trend && <p className="stat-trend">{trend}</p>}
      </div>
    </div>
  );

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
        <div>
          <h2>Welcome, {currentUser?.name || 'Customer'}!</h2>
          <p>Here's a summary of your account</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading your data...</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <StatCard
              icon="shopping-bag"
              label="Total Purchases"
              value={stats.invoiceCount}
              trend={`₹${stats.totalSpent?.toLocaleString('en-IN') || 0}`}
            />
            <StatCard
              icon="shield"
              label="Active Warranties"
              value={stats.warrantyCount}
              trend={stats.expiringWarranties ? `${stats.expiringWarranties} expiring soon` : 'All active'}
            />
            <StatCard
              icon="layers"
              label="Total Invoices"
              value={stats.invoiceCount}
            />
            <StatCard
              icon="trending-up"
              label="Member Since"
              value={stats.memberSince ? new Date(stats.memberSince).getFullYear() : 'New'}
              trend={stats.memberSince ? `${Math.round((new Date() - new Date(stats.memberSince)) / (1000 * 60 * 60 * 24))} days` : '0 days'}
            />
          </div>

          {/* Quick Actions */}
          <div className="portal-section mt-4">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions">
              <a href="#invoices" className="action-card">
                <Icon name="layers" size={20} />
                <span>View Invoices</span>
              </a>
              <a href="#warranties" className="action-card">
                <Icon name="shield" size={20} />
                <span>Manage Warranties</span>
              </a>
              <a href="#profile" className="action-card">
                <Icon name="user" size={20} />
                <span>Update Profile</span>
              </a>
            </div>
          </div>

          {/* Help Section */}
          <div className="help-section">
            <Icon name="help-circle" size={20} />
            <div>
              <p className="help-title">Need Help?</p>
              <p className="help-text">Contact our support team at support@2607electronics.com or call 7594012761</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerDashboard;
