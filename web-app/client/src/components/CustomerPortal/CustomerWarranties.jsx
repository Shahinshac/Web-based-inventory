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

  const [isLinking, setIsLinking] = useState(false);
  const [linkInvoiceNo, setLinkInvoiceNo] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return <span className="badge badge-success"><Icon name="shield-check" size={10} /> Active (Protected)</span>;
    if (s === 'expiring_soon') return <span className="badge badge-warning"><Icon name="clock" size={10} /> Expiring Soon (Renew Now)</span>;
    if (s === 'expired') return <span className="badge badge-danger"><Icon name="shield-off" size={10} /> Expired (Protection Ended)</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  const handleLinkWarranty = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    if (!linkInvoiceNo.trim()) return;

    try {
      setIsLinking(true);
      const response = await apiPost('/api/customer-portal/warranties/link', { invoiceNumber: linkInvoiceNo });
      await loadWarranties(1);
      setLinkSuccess(response.message || 'Warranty linked successfully!');
      setLinkInvoiceNo('');
      setTimeout(() => setLinkSuccess(''), 5000);
    } catch (err) {
      setLinkError(err.message || 'Failed to link warranty. Please check the invoice number.');
    } finally {
      setIsLinking(false);
    }
  };

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
        <div className="portal-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h2 className="portal-card-title">
            <Icon name="shield" size={20} />
            My Product Warranties
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            List of all products currently covered or previously protected.
          </p>
        </div>

        {/* Link Missing Warranty Section */}
        <div className="link-missing-box" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px dashed #cbd5e1' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="plus-circle" size={16} /> Missing a warranty?
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Enter your invoice number to search and link it to your account.</p>
          <form onSubmit={handleLinkWarranty} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. INV-2024-001" 
              value={linkInvoiceNo}
              onChange={(e) => setLinkInvoiceNo(e.target.value)}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <button type="submit" className="logout-btn" style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem 1rem' }} disabled={isLinking}>
              {isLinking ? 'Searching...' : 'Search & Link'}
            </button>
          </form>
          {linkError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{linkError}</p>}
          {linkSuccess && <p style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.5rem' }}>{linkSuccess}</p>}
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
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try searching by invoice number above.</p>
          </div>
        ) : (
          <div className="portal-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Bill Info</th>
                  <th>Expiry Date</th>
                  <th>Coverage Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((warranty) => (
                  <tr key={warranty.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{warranty.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SN: {warranty.serialNumber || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{warranty.invoiceNumber}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(warranty.invoiceDate)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: warranty.daysLeft <= 30 && warranty.status !== 'expired' ? '#f59e0b' : '#1e293b' }}>{formatDate(warranty.expiryDate)}</div>
                      <div style={{ fontSize: '0.75rem', color: warranty.daysLeft <= 30 ? '#ef4444' : '#64748b' }}>
                        {warranty.status === 'expired' ? 'Protection ended' : `${warranty.daysLeft} days left`}
                      </div>
                    </td>
                    <td>{getStatusBadge(warranty.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {warranty.status === 'expired' ? (
                        <button className="logout-btn" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontSize: '0.8rem' }} onClick={() => handleRenew(warranty.id)}>
                          Renew Plan
                        </button>
                      ) : (
                        <button className="logout-btn" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                          View Details
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
