/**
 * @file CustomerInvoices.jsx
 * @description Display customer's purchase invoices with download option
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet } from '../../utils/api';

const CustomerInvoices = ({ currentUser }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await apiGet('/api/customer/invoices');
        setInvoices(response.invoices || []);
        setFilteredInvoices(response.invoices || []);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch invoices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  useEffect(() => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(inv =>
        inv._id?.includes(searchTerm) ||
        inv.invoiceNumber?.includes(searchTerm)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, filterStatus]);

  const handleDownloadPDF = async (invoiceId) => {
    try {
      // Call API to generate and download PDF
      const link = document.createElement('a');
      link.href = `/api/customer/invoices/${invoiceId}/pdf`;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download invoice:', err);
    }
  };

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
        <h2>My Invoices</h2>
        <p>View and download your purchase invoices</p>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Invoices</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Invoices List */}
      {loading ? (
        <div className="loading-state">
          <p>Loading your invoices...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="empty-state">
          <Icon name="inbox" size={48} />
          <p>No invoices found</p>
          <span>You haven't made any purchases yet</span>
        </div>
      ) : (
        <div className="invoices-list">
          {filteredInvoices.map(invoice => (
            <div key={invoice._id} className="invoice-row">
              <div className="invoice-info">
                <div className="invoice-number">
                  <Icon name="layers" size={16} />
                  <div>
                    <p className="invoice-id">Invoice #{invoice.invoiceNumber || invoice._id.slice(-6)}</p>
                    <p className="invoice-date">
                      {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="invoice-amount">
                  <p className="amount">₹{invoice.totalAmount?.toLocaleString('en-IN') || 0}</p>
                  <p className={`status ${invoice.status || 'completed'}`}>
                    {invoice.status || 'Completed'}
                  </p>
                </div>
              </div>
              <div className="invoice-actions">
                <button
                  className="action-btn view-btn"
                  onClick={() => alert('Invoice details: ' + invoice._id)}
                  title="View Details"
                >
                  <Icon name="eye" size={16} />
                </button>
                <button
                  className="action-btn download-btn"
                  onClick={() => handleDownloadPDF(invoice._id)}
                  title="Download PDF"
                >
                  <Icon name="download" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerInvoices;
