/**
 * @file CustomerWarranties.jsx
 * @description Rebuilt customer warranty tracker
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerWarranties, renewWarranty } from '../../services/customerPortalService';
import { formatDateOnlyIST } from '../../utils/dateFormatter';

const CustomerWarranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    loadWarranties(1);
  }, []);

  useEffect(() => {
    // Refresh current time regularly so "days left" updates as day changes.
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const parseDate = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    let parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    parsed = new Date(raw.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getDaysLeft = (expiryDate) => {
    const expiry = parseDate(expiryDate);
    if (!expiry) return 0;
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((expiryStart - todayStart) / msPerDay);
  };

  const getComputedStatus = (daysLeft) => {
    if (daysLeft <= 0) return 'expired';
    if (daysLeft <= 30) return 'expiring_soon';
    return 'active';
  };

  const formatDate = (value) => {
    const parsed = parseDate(value);
    if (!parsed) return 'N/A';
    return formatDateOnlyIST(parsed);
  };

  const loadWarranties = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerWarranties(page, pagination.limit);
      setWarranties(data.warranties || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load warranties');
    } finally {
      setLoading(false);
    }
  };

  const handleRenew = async (warrantyId) => {
    if (!window.confirm('Renew this warranty for 1 year?')) return;
    
    try {
      await renewWarranty(warrantyId);
      alert('Warranty renewed successfully!');
      loadWarranties(pagination.page);
    } catch (err) {
      alert('Failed to renew warranty: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <span className="badge badge-success">Active</span>,
      expiring_soon: <span className="badge badge-warning">Expiring Soon</span>,
      expired: <span className="badge badge-danger">Expired</span>
    };
    return badges[status] || badges.expired;
  };

  const warrantiesWithLiveStatus = warranties.map((w) => {
    const liveDaysLeft = getDaysLeft(w.expiryDate);
    return {
      ...w,
      liveDaysLeft,
      liveStatus: getComputedStatus(liveDaysLeft)
    };
  });

  const filteredWarranties = warrantiesWithLiveStatus.filter(w => {
    if (filter === 'all') return true;
    return w.liveStatus === filter;
  });

  if (loading && warranties.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const activeCount = warrantiesWithLiveStatus.filter(w => w.liveStatus === 'active').length;
  const expiringCount = warrantiesWithLiveStatus.filter(w => w.liveStatus === 'expiring_soon').length;
  const expiredCount = warrantiesWithLiveStatus.filter(w => w.liveStatus === 'expired').length;

  return (
    <div className="customer-warranties">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="shield" size={24} />
            My Warranties
          </h2>
          <button className="btn-secondary" onClick={() => loadWarranties(pagination.page)} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="portal-filter-row" style={{ marginBottom: '1rem' }}>
          <button
            className={`btn-${filter === 'all' ? 'primary' : 'secondary'}`}
            onClick={() => setFilter('all')}
            style={{ padding: '0.5rem 1rem' }}
          >
            All ({warranties.length})
          </button>
          <button
            className={`btn-${filter === 'active' ? 'primary' : 'secondary'}`}
            onClick={() => setFilter('active')}
            style={{ padding: '0.5rem 1rem' }}
          >
            Active ({activeCount})
          </button>
          <button
            className={`btn-${filter === 'expiring_soon' ? 'primary' : 'secondary'}`}
            onClick={() => setFilter('expiring_soon')}
            style={{ padding: '0.5rem 1rem' }}
          >
            Expiring ({expiringCount})
          </button>
          <button
            className={`btn-${filter === 'expired' ? 'primary' : 'secondary'}`}
            onClick={() => setFilter('expired')}
            style={{ padding: '0.5rem 1rem' }}
          >
            Expired ({expiredCount})
          </button>
        </div>

        {error && (
          <div className="error-message">
            <Icon name="alert-circle" size={20} />
            <span>{error}</span>
          </div>
        )}

        {filteredWarranties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡️</div>
            <p>No warranties found</p>
          </div>
        ) : (
          <>
            <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
                  <th>Invoice</th>
                  <th>Start Date</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarranties.map((warranty) => (
                  <tr key={warranty.id}>
                    <td><strong>{warranty.productName || 'Unknown Product'}</strong></td>
                    <td>{warranty.productSku || 'N/A'}</td>
                    <td>{warranty.warrantyType || 'Standard'}</td>
                    <td>{warranty.invoiceNumber || 'N/A'}</td>
                    <td>{formatDate(warranty.startDate)}</td>
                    <td>{formatDate(warranty.expiryDate)}</td>
                    <td>
                      {warranty.liveDaysLeft > 0 ? (
                        <strong style={{ color: warranty.liveDaysLeft <= 30 ? '#e53e3e' : '#2d3748' }}>
                          {warranty.liveDaysLeft} days
                        </strong>
                      ) : (
                        <span style={{ color: '#a0aec0' }}>Expired</span>
                      )}
                    </td>
                    <td>{getStatusBadge(warranty.liveStatus)}</td>
                    <td>
                      {warranty.liveStatus === 'expired' && (
                        <button
                          className="btn-primary"
                          onClick={() => handleRenew(warranty.id)}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Renew
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="portal-mobile-list">
              {filteredWarranties.map((warranty) => (
                <article className="portal-mobile-card" key={`warranty-${warranty.id}`}>
                  <div className="portal-mobile-row"><span>Product</span><strong>{warranty.productName || 'Unknown Product'}</strong></div>
                  <div className="portal-mobile-row"><span>SKU</span><strong>{warranty.productSku || 'N/A'}</strong></div>
                  <div className="portal-mobile-row"><span>Type</span><strong>{warranty.warrantyType || 'Standard'}</strong></div>
                  <div className="portal-mobile-row"><span>Invoice</span><strong>{warranty.invoiceNumber || 'N/A'}</strong></div>
                  <div className="portal-mobile-row"><span>Start</span><strong>{formatDate(warranty.startDate)}</strong></div>
                  <div className="portal-mobile-row"><span>Expiry</span><strong>{formatDate(warranty.expiryDate)}</strong></div>
                  <div className="portal-mobile-row"><span>Days Left</span><strong>{warranty.liveDaysLeft > 0 ? `${warranty.liveDaysLeft} days` : 'Expired'}</strong></div>
                  <div style={{ marginTop: '0.5rem' }}>{getStatusBadge(warranty.liveStatus)}</div>
                  {warranty.liveStatus === 'expired' && (
                    <button
                      className="btn-primary"
                      onClick={() => handleRenew(warranty.id)}
                      style={{ marginTop: '0.75rem', width: '100%' }}
                    >
                      Renew
                    </button>
                  )}
                </article>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem'
              }}>
                <button
                  className="btn-secondary"
                  onClick={() => loadWarranties(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </button>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 1rem',
                  color: '#4a5568'
                }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => loadWarranties(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerWarranties;
