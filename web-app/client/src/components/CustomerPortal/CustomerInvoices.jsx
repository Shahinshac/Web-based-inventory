/**
 * @file CustomerInvoices.jsx
 * @description Ultra-Premium Customer invoices list with high-octane technical styling
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerInvoices, downloadInvoicePDF } from '../../services/customerPortalService';
import { formatTimestampIST, formatDateOnlyIST } from '../../utils/dateFormatter';

const CustomerInvoices = ({ currentUser }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadInvoices(pagination.page);
  }, []);

  const loadInvoices = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerInvoices(page, pagination.limit);
      setInvoices(data.invoices || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoiceId, invoiceNo) => {
    try {
      setDownloadingId(invoiceId);
      await downloadInvoicePDF(invoiceId);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

  const getPaymentBadge = (invoice) => {
    const method = String(invoice.paymentMethod || '').toLowerCase();
    if (invoice.emiEnabled || method === 'emi') {
      return <span className="badge badge-emi"><Icon name="calendar" size={10} /> EMI Plan</span>;
    }
    if (method === 'upi') {
      return <span className="badge badge-upi"><Icon name="smartphone" size={10} /> UPI</span>;
    }
    if (method === 'card') {
      return <span className="badge badge-card"><Icon name="credit-card" size={10} /> Card</span>;
    }
    return <span className="badge badge-cash"><Icon name="dollar-sign" size={10} /> Cash</span>;
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="customer-invoices">
      {/* Header & Controls */}
      <div className="portal-card glass-header">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="file-text" size={24} />
            Invoice History
          </h2>
          <div className="search-wrapper">
            <Icon name="search" size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by ID or Date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-search"
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            <Icon name="alert-circle" size={20} />
            <span>{error}</span>
          </div>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="empty-state">
            <Icon name="file-minus" size={60} />
            <p>{searchTerm ? 'No matches found' : 'No invoices on record'}</p>
          </div>
        ) : (
          <div className="invoices-content">
            <div className="portal-table-wrap">
              <table className="portal-table premium-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Date & Time</th>
                    <th>Items</th>
                    <th>Payment</th>
                    <th>Total Amount</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="invoice-row">
                      <td>
                        <div className="id-cell">
                          <span className="id-prefix">INV</span>
                          <span className="id-number">{invoice.invoiceNo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-time-stack">
                          <span className="main-date">{formatDateOnlyIST(invoice.date)}</span>
                          <span className="sub-time">{formatTimestampIST(invoice.date).split(',')[1]}</span>
                        </div>
                      </td>
                      <td>
                        <span className="item-pill">{invoice.itemCount || 0} Products</span>
                      </td>
                      <td>
                        <div className="payment-cell">
                          {getPaymentBadge(invoice)}
                          {invoice.emiEnabled && (
                            <div className="emi-mini-details">
                              {invoice.emiTenure} Months Plan
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="amount-cell">
                          <span className="currency">₹</span>
                          <span className="value">{Number(invoice.total).toLocaleString()}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`download-btn ${downloadingId === invoice.id ? 'loading' : ''}`}
                          onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNo)}
                          disabled={downloadingId === invoice.id}
                        >
                          {downloadingId === invoice.id ? (
                            <div className="spinner-mini"></div>
                          ) : (
                            <>
                              <Icon name="download" size={16} />
                              <span>PDF</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="pagination-premium">
                <button
                  className="page-btn"
                  onClick={() => loadInvoices(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  <Icon name="chevron-left" size={18} />
                </button>
                <div className="page-indicator">
                  <span className="current">{pagination.page}</span>
                  <span className="sep">/</span>
                  <span className="total">{pagination.pages}</span>
                </div>
                <button
                  className="page-btn"
                  onClick={() => loadInvoices(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                >
                  <Icon name="chevron-right" size={18} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .glass-header {
          border-top: 4px solid var(--portal-accent);
        }
        
        .search-wrapper {
          position: relative;
          width: 300px;
        }
        
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--portal-text-dim);
        }
        
        .premium-search {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--portal-border);
          border-radius: 12px;
          padding: 0.6rem 1rem 0.6rem 2.8rem;
          color: white;
          font-weight: 500;
          transition: all 0.3s;
        }
        
        .premium-search:focus {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--portal-accent);
          outline: none;
          box-shadow: 0 0 15px var(--portal-accent-glow);
        }
        
        .premium-table th {
          font-size: 0.75rem;
          color: var(--portal-text-dim);
          border-bottom: 2px solid var(--portal-border);
        }
        
        .invoice-row:hover td {
          background: rgba(99, 102, 241, 0.05) !important;
        }
        
        .id-cell {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .id-prefix {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--portal-text-dim);
          background: var(--portal-glass);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
        }
        
        .id-number {
          font-weight: 700;
          color: var(--portal-accent);
          letter-spacing: 0.05em;
        }
        
        .date-time-stack {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        
        .main-date {
          font-weight: 600;
          color: white;
        }
        
        .sub-time {
          font-size: 0.75rem;
          color: var(--portal-text-dim);
        }
        
        .item-pill {
          background: var(--portal-glass);
          padding: 0.3rem 0.8rem;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--portal-text-dim);
          border: 1px solid var(--portal-border);
        }
        
        .payment-cell {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        
        .emi-mini-details {
          font-size: 0.7rem;
          color: var(--portal-secondary);
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .badge-emi { background: rgba(236, 72, 153, 0.1); color: #ec4899; border: 1px solid rgba(236, 72, 153, 0.2); }
        .badge-upi { background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); }
        .badge-card { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
        .badge-cash { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        
        .amount-cell {
          display: flex;
          align-items: baseline;
          gap: 0.2rem;
        }
        
        .amount-cell .currency { color: var(--portal-text-dim); font-size: 0.9rem; font-weight: 600; }
        .amount-cell .value { color: white; font-size: 1.2rem; font-weight: 800; }
        
        .download-btn {
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          color: white;
          padding: 0.5rem 1.2rem;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .download-btn:hover:not(:disabled) {
          background: var(--portal-accent);
          border-color: var(--portal-accent);
          box-shadow: 0 0 15px var(--portal-accent-glow);
          transform: translateY(-2px);
        }
        
        .pagination-premium {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.5rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--portal-border);
        }
        
        .page-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .page-btn:hover:not(:disabled) {
          background: var(--portal-accent);
          border-color: var(--portal-accent);
        }
        
        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .page-indicator {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 800;
          font-size: 1.1rem;
        }
        
        .page-indicator .current { color: var(--portal-accent); }
        .page-indicator .sep { color: var(--portal-text-dim); }
        .page-indicator .total { color: var(--portal-text-dim); }

        @media (max-width: 768px) {
          .search-wrapper { width: 100%; }
          .premium-table th:nth-child(3),
          .premium-table td:nth-child(3),
          .premium-table th:nth-child(4),
          .premium-table td:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerInvoices;
