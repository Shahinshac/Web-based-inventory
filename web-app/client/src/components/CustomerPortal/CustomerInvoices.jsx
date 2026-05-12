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
    inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;

  if (loading && invoices.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="customer-invoices">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="file-text" size={20} />
            Billing History
          </h2>
          <div style={{ position: 'relative', width: '250px' }}>
            <Icon name="search" size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.5rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>

        {error && (
          <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem' }}>
            <Icon name="alert-circle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {filteredInvoices.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Icon name="file-minus" size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>{searchTerm ? 'No matches found' : 'No invoices yet.'}</p>
          </div>
        ) : (
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>#{invoice.invoiceNo}</span>
                    </td>
                    <td>{formatDateOnlyIST(invoice.date)}</td>
                    <td>{invoice.itemCount || 0} Products</td>
                    <td style={{ fontWeight: 700 }}>{formatAmount(invoice.total)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="logout-btn"
                        style={{ background: '#f8fafc', color: '#6366f1', border: '1px solid #e2e8f0', padding: '0.4rem 0.8rem' }}
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNo)}
                        disabled={downloadingId === invoice.id}
                      >
                        {downloadingId === invoice.id ? '...' : <Icon name="download" size={14} />}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              className="logout-btn"
              onClick={() => loadInvoices(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{ padding: '0.4rem 1rem' }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontWeight: 600, color: '#64748b' }}>
              {pagination.page} / {pagination.pages}
            </span>
            <button
              className="logout-btn"
              onClick={() => loadInvoices(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              style={{ padding: '0.4rem 1rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInvoices;

