/**
 * @file CustomerInvoices.jsx
 * @description Display customer's purchase invoices with download option
 */

import React, { useState } from 'react';
import Icon from '../../Icon.jsx';

const CustomerInvoices = ({ currentUser, invoices = [], loading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInvoices = (invoices || []).filter(inv => {
    // Filter by search term
    const matchesSearch = !searchTerm || 
      inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status (paymentMethod)
    const matchesStatus = filterStatus === 'all' || 
      (inv.paymentMethod?.toLowerCase() === filterStatus.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const { downloadInvoicePDF } = await import('../../services/customerPortalService');
      await downloadInvoicePDF(invoiceId);
    } catch (err) {
      console.error('Failed to download invoice:', err);
      alert('Failed to download invoice. Please try again later.');
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
            <div key={invoice.id} className="invoice-row">
              <div className="invoice-info">
                <div className="invoice-number">
                  <Icon name="layers" size={16} />
                  <div>
                    <p className="invoice-id">Invoice #{invoice.invoiceNo || invoice.id.slice(-6)}</p>
                    <p className="invoice-date">
                      {new Date(invoice.date).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="invoice-amount">
                  <p className="amount">₹{invoice.total?.toLocaleString('en-IN') || 0}</p>
                  <p className={`status ${invoice.paymentMethod || 'completed'}`}>
                    {invoice.paymentMethod || 'Completed'}
                  </p>
                </div>
              </div>
              <div className="invoice-actions">
                <button
                  className="action-btn view-btn"
                  onClick={() => alert('Invoice details: ' + invoice.id)}
                  title="View Details"
                >
                  <Icon name="eye" size={16} />
                </button>
                <button
                  className="action-btn download-btn"
                  onClick={() => handleDownloadPDF(invoice.id)}
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
