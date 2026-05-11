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

  if (error) {
    return (
      <div className="error-message">
        <Icon name="alert-circle" size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const memberSince = stats?.memberSince
    ? formatDateOnlyIST(stats.memberSince)
    : 'N/A';

  return (
    <div className="customer-dashboard">
      {/* Welcome Section */}
      <div className="portal-card welcome-hero">
        <div className="hero-content">
          <div className="welcome-badge">
            <Icon name="award" size={14} />
            <span>Premium Member</span>
          </div>
          <h2 className="portal-card-title">
            Greetings, {currentUser?.name || 'Valued Customer'}
          </h2>
          <p className="hero-subtitle">
            Your exclusive dashboard for orders, warranties, and EMI plans.
          </p>
          <div className="member-since-tag">
            <Icon name="calendar" size={14} />
            <span>Member since {memberSince}</span>
          </div>
        </div>
        <div className="hero-decoration">
          <Icon name="zap" size={80} className="glow-icon" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <Icon name="shopping-bag" size={24} />
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-info">
            <div className="stat-label">Purchases</div>
            <div className="stat-value">{stats?.stats?.totalPurchases || 0}</div>
          </div>
        </div>

        <div className="stat-card accent-pink">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <Icon name="credit-card" size={24} />
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">₹{stats?.stats?.totalSpent?.toLocaleString() || 0}</div>
          </div>
        </div>

        <div className="stat-card accent-green">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <Icon name="shield-check" size={24} />
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-info">
            <div className="stat-label">Active Warranties</div>
            <div className="stat-value">{stats?.stats?.activeWarranties || 0}</div>
          </div>
        </div>

        <div className="stat-card accent-amber">
          <div className="stat-icon-wrapper">
            <div className="stat-icon">
              <Icon name="clock" size={24} />
            </div>
            <div className="stat-glow"></div>
          </div>
          <div className="stat-info">
            <div className="stat-label">Expiring Soon</div>
            <div className="stat-value">{stats?.stats?.expiredWarranties || 0}</div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="dashboard-sections-grid">
        <div className="portal-card activity-card">
          <div className="portal-card-header">
            <h3 className="portal-card-title">
              <Icon name="activity" size={20} />
              Recent Orders
            </h3>
            <button className="view-all-link">View All</button>
          </div>
          
          {stats?.recentPurchases && stats.recentPurchases.length > 0 ? (
            <div className="portal-table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date & Time</th>
                    <th>Items</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <span className="invoice-tag">#{purchase.invoiceNo}</span>
                      </td>
                      <td>
                        <div className="date-time-cell">
                          <Icon name="calendar" size={12} />
                          <span>{formatTimestampIST(purchase.date)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="items-count">{purchase.itemCount} Items</span>
                      </td>
                      <td>
                        <span className="amount-highlight">₹{purchase.total.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-mini">
              <Icon name="shopping-cart" size={40} />
              <p>No recent orders found</p>
            </div>
          )}
        </div>

        <div className="portal-card profile-summary-card">
          <div className="portal-card-header">
            <h3 className="portal-card-title">
              <Icon name="user-check" size={20} />
              Account Status
            </h3>
          </div>
          <div className="status-list">
            <div className="status-item">
              <div className="status-dot online"></div>
              <div className="status-info">
                <span className="status-label">Verification</span>
                <span className="status-value">Verified Account</span>
              </div>
            </div>
            <div className="status-item">
              <div className="status-dot warning"></div>
              <div className="status-info">
                <span className="status-label">KYC Status</span>
                <span className="status-value">Pending Update</span>
              </div>
            </div>
            <div className="status-item">
              <div className="status-dot success"></div>
              <div className="status-info">
                <span className="status-label">Rewards</span>
                <span className="status-value">520 Points Earned</span>
              </div>
            </div>
          </div>
          <button className="btn-primary full-width" style={{ marginTop: '2rem' }}>
            Complete Profile
          </button>
        </div>
      </div>

      <style jsx>{`
        .welcome-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%);
          border-left: 4px solid var(--portal-accent);
          overflow: hidden;
          position: relative;
        }
        
        .welcome-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          padding: 0.3rem 0.8rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 1rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .hero-subtitle {
          color: var(--portal-text-dim);
          font-size: 1.1rem;
          margin-bottom: 1.5rem;
        }
        
        .member-since-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--portal-text-dim);
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .glow-icon {
          color: var(--portal-accent);
          opacity: 0.3;
          filter: blur(2px) drop-shadow(0 0 20px var(--portal-accent));
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        
        .stat-icon-wrapper {
          position: relative;
        }
        
        .stat-icon {
          width: 64px;
          height: 64px;
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--portal-accent);
          z-index: 1;
          position: relative;
        }
        
        .stat-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
          background: var(--portal-accent);
          filter: blur(25px);
          opacity: 0.2;
          z-index: 0;
        }
        
        .accent-pink .stat-icon { color: var(--portal-secondary); border-color: rgba(236, 72, 153, 0.3); }
        .accent-pink .stat-glow { background: var(--portal-secondary); }
        
        .accent-green .stat-icon { color: #10b981; border-color: rgba(16, 185, 129, 0.3); }
        .accent-green .stat-glow { background: #10b981; }
        
        .accent-amber .stat-icon { color: #f59e0b; border-color: rgba(245, 158, 11, 0.3); }
        .accent-amber .stat-glow { background: #f59e0b; }
        
        .dashboard-sections-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }
        
        .view-all-link {
          background: transparent;
          border: none;
          color: var(--portal-accent);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
        
        .invoice-tag {
          background: var(--portal-glass);
          padding: 0.4rem 0.8rem;
          border-radius: 8px;
          border: 1px solid var(--portal-border);
          font-family: monospace;
          color: var(--portal-accent);
        }
        
        .date-time-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: var(--portal-text-dim);
        }
        
        .items-count {
          font-weight: 600;
          color: var(--portal-text-dim);
        }
        
        .amount-highlight {
          font-weight: 800;
          color: white;
          font-size: 1.1rem;
        }
        
        .status-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        
        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        
        .status-dot.online { color: var(--portal-accent); background: var(--portal-accent); }
        .status-dot.warning { color: var(--portal-secondary); background: var(--portal-secondary); }
        .status-dot.success { color: #10b981; background: #10b981; }
        
        .status-info {
          display: flex;
          flex-direction: column;
        }
        
        .status-label {
          font-size: 0.75rem;
          color: var(--portal-text-dim);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        
        .status-value {
          font-weight: 600;
          color: white;
        }
        
        .full-width { width: 100%; }

        @media (max-width: 1100px) {
          .dashboard-sections-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
