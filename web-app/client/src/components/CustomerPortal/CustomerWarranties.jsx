/**
 * @file CustomerWarranties.jsx
 * @description Customer warranties with status tracking and renewal
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerWarranties, renewWarranty } from '../../services/customerPortalService';

const CustomerWarranties = ({ currentUser }) => {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerWarranties(page, pagination.limit);
      setWarranties(data.warranties || []);
      setPagination(data.pagination || pagination);
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

  const filteredWarranties = warranties.filter(w => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  if (loading && warranties.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  const activeCoun = warranties.filter(w => w.status === 'active').length;
  const expiringCount = warranties.filter(w => w.status === 'expiring_soon').length;
  const expiredCount = warranties.filter(w => w.status === 'expired').length;

  return (
    <div className="customer-warranties">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="shield" size={24} />
            My Warranties
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              Active ({activeCoun})
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
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Type</th>
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
                    <td><strong>{warranty.productName}</strong></td>
                    <td>{warranty.productSku}</td>
                    <td>{warranty.warrantyType || 'Standard'}</td>
                    <td>
                      {warranty.startDate 
                        ? new Date(warranty.startDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </td>
                    <td>
                      {warranty.expiryDate 
                        ? new Date(warranty.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A'}
                    </td>
                    <td>
                      {warranty.daysLeft > 0 ? (
                        <strong style={{ color: warranty.daysLeft <= 30 ? '#e53e3e' : '#2d3748' }}>
                          {warranty.daysLeft} days
                        </strong>
                      ) : (
                        <span style={{ color: '#a0aec0' }}>Expired</span>
                      )}
                    </td>
                    <td>{getStatusBadge(warranty.status)}</td>
                    <td>
                      {warranty.status === 'expired' && (
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

            {/* Pagination */}
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
