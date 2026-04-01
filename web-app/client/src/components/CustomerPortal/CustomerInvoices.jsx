/**
 * @file CustomerInvoices.jsx
 * @description Customer invoices list with search, filter, and PDF download
 */

import React, { useState, useEffect } from 'react';
import Icon from '../Icon';
import { fetchCustomerInvoices, downloadInvoicePDF } from '../../services/customerPortalService';

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
      alert('Failed to download invoice: ' + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.date?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Icon name="layers" size={24} />
            My Invoices
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.875rem'
              }}
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
            <div className="empty-state-icon">📄</div>
            <p>{searchTerm ? 'No invoices found matching your search' : 'No invoices yet'}</p>
          </div>
        ) : (
          <>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.invoiceNo}</strong></td>
                    <td>
                      {new Date(invoice.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td>{invoice.itemCount || 0} items</td>
                    <td>
                      <span className="badge badge-info">
                        {invoice.paymentMethod || 'cash'}
                      </span>
                    </td>
                    <td><strong>₹{invoice.total.toLocaleString()}</strong></td>
                    <td>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNo)}
                        disabled={downloadingId === invoice.id}
                        style={{ 
                          padding: '0.5rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        {downloadingId === invoice.id ? (
                          <>
                            <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                            <span>Downloading...</span>
                          </>
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
                  onClick={() => loadInvoices(pagination.page - 1)}
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
                  onClick={() => loadInvoices(pagination.page + 1)}
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

export default CustomerInvoices;
