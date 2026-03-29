/**
 * @file CustomerDashboard.jsx
 * @description Customer dashboard showing purchase summary and recent activities
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet } from '../../utils/api';
import { downloadPVCCard, downloadVCard, downloadInvoicePDF } from '../../services/customerPortalService';

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

          {/* Recent Purchases Section */}
          <div className="portal-section mt-4">
            <div className="section-header-inline">
              <h3 className="section-title">Recent Purchases</h3>
              <a href="#invoices" className="link-more">View All Invoices →</a>
            </div>
            
            <div className="recent-list-container">
              {incomingStats?.recentPurchases && incomingStats.recentPurchases.length > 0 ? (
                <div className="table-responsive">
                  <table className="portal-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomingStats.recentPurchases.map(inv => (
                        <tr key={inv.id}>
                          <td className="font-weight-bold">#{inv.invoiceNo}</td>
                          <td>{new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td>{inv.itemCount} items</td>
                          <td className="font-weight-bold">₹{inv.total.toLocaleString('en-IN')}</td>
                          <td>
                            <button 
                              className="btn-icon-sm" 
                              onClick={() => downloadInvoicePDF(inv.id)}
                              title="Download PDF"
                            >
                              <Icon name="download" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-mini">
                  <Icon name="shopping-bag" size={24} />
                  <p>No recent purchases found</p>
                </div>
              )}
            </div>
          </div>

          <div className="portal-section mt-4 grid-2">
            <div className="dashboard-column">
              <h3 className="section-title">Quick Actions</h3>
              <div className="quick-actions-list">
                <a href="#invoices" className="action-row">
                  <div className="action-icon"><Icon name="layers" size={18} /></div>
                  <span>View My Invoices</span>
                  <Icon name="chevron-right" size={14} className="ml-auto" />
                </a>
                <a href="#warranties" className="action-row">
                  <div className="action-icon"><Icon name="shield" size={18} /></div>
                  <span>Check Warranties</span>
                  <Icon name="chevron-right" size={14} className="ml-auto" />
                </a>
                <a href="#profile" className="action-row">
                  <div className="action-icon"><Icon name="user" size={18} /></div>
                  <span>Account Settings</span>
                  <Icon name="chevron-right" size={14} className="ml-auto" />
                </a>
              </div>
            </div>

            <div className="dashboard-column">
              <h3 className="section-title">Digital Identity</h3>
              <div className="identity-card-demo">
                <div className="card-mockup">
                  <div className="card-header">
                    <span className="card-logo">⚡</span>
                    <span className="card-brand">26:07</span>
                  </div>
                  <div className="card-body">
                    <p className="card-holder">{currentUser?.name || 'Customer'}</p>
                    <p className="card-type">Premium Member</p>
                  </div>
                </div>
                <div className="identity-actions">
                  <button onClick={downloadVCard} className="btn-identity">
                    <Icon name="user-plus" size={16} />
                    <span>Save Contact</span>
                  </button>
                  <button onClick={downloadPVCCard} className="btn-identity secondary">
                    <Icon name="download" size={16} />
                    <span>Member ID</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

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
