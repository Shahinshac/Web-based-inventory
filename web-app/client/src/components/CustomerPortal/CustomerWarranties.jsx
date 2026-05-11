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
      {/* Overview & Filters */}
      <div className="portal-card glass-header">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="shield" size={24} />
            Warranty Management
          </h2>
          <div className="filter-pill-box">
            <button className={`filter-pill ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              <span>All</span>
              <span className="count">{warranties.length}</span>
            </button>
            <button className={`filter-pill ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
              <span>Active</span>
              <span className="count">{activeCount}</span>
            </button>
            <button className={`filter-pill ${filter === 'expiring_soon' ? 'active' : ''}`} onClick={() => setFilter('expiring_soon')}>
              <span>Expiring</span>
              <span className="count">{expiringCount}</span>
            </button>
            <button className={`filter-pill ${filter === 'expired' ? 'active' : ''}`} onClick={() => setFilter('expired')}>
              <span>Expired</span>
              <span className="count">{expiredCount}</span>
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
            <Icon name="shield-off" size={60} />
            <p>No warranties match your filter</p>
          </div>
        ) : (
          <div className="warranties-content">
            <div className="portal-table-wrap premium-wrap">
              <table className="portal-table premium-table">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Reference</th>
                    <th>Timeline</th>
                    <th>Status</th>
                    <th>Remaining</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarranties.map((warranty) => (
                    <tr key={warranty.id} className="warranty-row">
                      <td>
                        <div className="product-info">
                          <span className="p-name">{warranty.productName}</span>
                          <div className="p-meta">
                            <span className="sku-tag">SKU: {warranty.productSku}</span>
                            <span className="type-tag">{warranty.warrantyType}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="ref-stack">
                          <span className="inv-label">Invoice</span>
                          <span className="inv-no">#{warranty.invoiceNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div className="timeline-stack">
                          <div className="t-row">
                            <Icon name="play" size={10} />
                            <span>Started: {formatDate(warranty.startDate)}</span>
                          </div>
                          <div className="t-row">
                            <Icon name="square" size={10} />
                            <span>Expires: {formatDate(warranty.expiryDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td>{getStatusBadge(warranty.status)}</td>
                      <td>
                        <div className="countdown-wrap">
                          {warranty.daysLeft > 0 ? (
                            <div className={`days-badge ${warranty.daysLeft <= 30 ? 'critical' : ''}`}>
                              <span className="num">{warranty.daysLeft}</span>
                              <span className="txt">Days</span>
                            </div>
                          ) : (
                            <span className="expired-label">PERIOD ENDED</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {warranty.status === 'expired' ? (
                          <button className="btn-primary renew-btn" onClick={() => handleRenew(warranty.id)}>
                            <Icon name="refresh-ccw" size={14} />
                            <span>Renew Now</span>
                          </button>
                        ) : (
                          <button className="btn-secondary details-btn">
                            <Icon name="file-text" size={14} />
                            <span>Certificate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .glass-header { border-top: 4px solid var(--portal-accent); }
        
        .filter-pill-box {
          display: flex;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.4rem;
          border-radius: 14px;
          border: 1px solid var(--portal-border);
        }
        
        .filter-pill {
          background: transparent;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          color: var(--portal-text-dim);
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .filter-pill:hover { color: white; }
        
        .filter-pill.active {
          background: var(--portal-accent);
          color: white;
          box-shadow: 0 4px 12px var(--portal-accent-glow);
        }
        
        .filter-pill .count {
          background: rgba(0, 0, 0, 0.2);
          padding: 0.1rem 0.4rem;
          border-radius: 6px;
          font-size: 0.75rem;
        }
        
        .product-info { display: flex; flex-direction: column; gap: 0.4rem; }
        .p-name { font-weight: 700; color: white; font-size: 1.1rem; }
        .p-meta { display: flex; gap: 0.5rem; }
        
        .sku-tag {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--portal-accent);
          background: rgba(99, 102, 241, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        
        .type-tag {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--portal-text-dim);
          background: var(--portal-glass);
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
        
        .ref-stack { display: flex; flex-direction: column; }
        .inv-label { font-size: 0.65rem; font-weight: 800; color: var(--portal-text-dim); text-transform: uppercase; }
        .inv-no { font-weight: 700; color: white; font-family: monospace; }
        
        .timeline-stack { display: flex; flex-direction: column; gap: 0.3rem; }
        .t-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--portal-text-dim); }
        .t-row span { font-weight: 600; }
        
        .countdown-wrap { display: flex; align-items: center; }
        
        .days-badge {
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          border-radius: 12px;
          padding: 0.4rem 0.8rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 70px;
        }
        
        .days-badge.critical { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); }
        .days-badge.critical .num { color: #f87171; }
        
        .days-badge .num { font-size: 1.2rem; font-weight: 800; color: #10b981; line-height: 1; }
        .days-badge .txt { font-size: 0.65rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
        
        .expired-label { font-size: 0.75rem; font-weight: 800; color: var(--portal-text-dim); letter-spacing: 0.05em; }
        
        .renew-btn { gap: 0.6rem; font-size: 0.85rem; padding: 0.5rem 1rem; }
        .details-btn { gap: 0.6rem; font-size: 0.85rem; padding: 0.5rem 1rem; }

        @media (max-width: 1000px) {
          .premium-table th:nth-child(2), .premium-table td:nth-child(2),
          .premium-table th:nth-child(3), .premium-table td:nth-child(3) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerWarranties;
