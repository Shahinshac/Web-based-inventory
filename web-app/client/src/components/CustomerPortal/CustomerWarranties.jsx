/**
 * @file CustomerWarranties.jsx
 * @description Ultra-Premium Customer warranty tracker with high-octane technical styling
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
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return formatDateOnlyIST(value);
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
      loadWarranties(pagination.page);
    } catch (err) {
      console.error('Renewal error:', err);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return <span className="badge badge-success"><Icon name="shield-check" size={10} /> Active</span>;
    if (s === 'expiring_soon') return <span className="badge badge-warning"><Icon name="clock" size={10} /> Expiring</span>;
    return <span className="badge badge-danger"><Icon name="shield-off" size={10} /> Expired</span>;
  };

  const filteredWarranties = warranties.filter(w => {
    if (filter === 'all') return true;
    return w.status === filter;
  });

  const activeCount = warranties.filter(w => w.status === 'active').length;
  const expiringCount = warranties.filter(w => w.status === 'expiring_soon').length;
  const expiredCount = warranties.filter(w => w.status === 'expired').length;

  if (loading && warranties.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="customer-warranties">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="shield" size={20} />
            Security & Warranties
          </h2>
        </div>

        {error && (
          <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert-circle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {warranties.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Icon name="shield-off" size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No warranties found for your account.</p>
          </div>
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Reference</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((warranty) => (
                  <tr key={warranty.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{warranty.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {warranty.productSku}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>#{warranty.invoiceNumber}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{formatDate(warranty.expiryDate)}</div>
                      <div style={{ fontSize: '0.75rem', color: warranty.daysLeft <= 30 ? '#ef4444' : '#64748b' }}>
                        {warranty.daysLeft} days remaining
                      </div>
                    </td>
                    <td>{getStatusBadge(warranty.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {warranty.status === 'expired' ? (
                        <button className="logout-btn" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' }} onClick={() => handleRenew(warranty.id)}>
                          Renew
                        </button>
                      ) : (
                        <button className="logout-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>
                          Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerWarranties;
