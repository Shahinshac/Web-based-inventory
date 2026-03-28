/**
 * @file PaymentLinkHistory.jsx
 * @description Payment link history and management component
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import {
  fetchPaymentLinks,
  markPaymentAsPaid,
  cancelPaymentLink,
  deletePaymentLink
} from '../../services/paymentLinkService';
import './paymentLinks.css';

const PaymentLinkHistory = () => {
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLink, setSelectedLink] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  const limit = 20;

  useEffect(() => {
    loadPaymentLinks();
  }, [page, statusFilter]);

  const loadPaymentLinks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchPaymentLinks(
        page,
        limit,
        statusFilter || null
      );
      setPaymentLinks(response.paymentLinks || []);
      setTotal(response.pagination?.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch payment links');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (linkId, newStatus) => {
    try {
      await (newStatus === 'paid'
        ? markPaymentAsPaid(linkId)
        : cancelPaymentLink(linkId));
      loadPaymentLinks();
      setSelectedLink(null);
    } catch (err) {
      setError(err.message || `Failed to ${newStatus} payment link`);
    }
  };

  const handleDelete = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this payment link?')) return;
    try {
      await deletePaymentLink(linkId);
      loadPaymentLinks();
    } catch (err) {
      setError(err.message || 'Failed to delete payment link');
    }
  };

  const getStatusBadge = (status) => {
    const statusClass = `status-badge ${status}`;
    const statusText = {
      pending: 'Pending',
      paid: 'Paid',
      expired: 'Expired',
      cancelled: 'Cancelled'
    };
    return <span className={statusClass}>{statusText[status] || status}</span>;
  };

  const getDaysLeft = (expiryDate) => {
    const days = Math.ceil(
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="payment-history">
      <div className="history-header">
        <div>
          <h2>
            <Icon name="list" size={24} />
            Payment Links History
          </h2>
          <p>View and manage all generated payment links</p>
        </div>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label htmlFor="status-filter">
            <Icon name="filter" size={14} />
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-msg">
          <Icon name="alert-circle" size={14} />
          {error}
        </div>
      )}

      {/* Links Table */}
      <div className="links-table-wrapper">
        {loading ? (
          <div className="loading">
            <Icon name="spinner" size={24} />
            <span>Loading payment links...</span>
          </div>
        ) : paymentLinks.length === 0 ? (
          <div className="empty-state">
            <Icon name="inbox" size={32} />
            <p>No payment links found</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="links-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Expires In</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentLinks.map(link => (
                    <tr key={link.id}>
                      <td className="transaction-id">
                        <code>{link.transactionId}</code>
                      </td>
                      <td>
                        <div className="customer-info">
                          <span className="name">{link.customerName}</span>
                          <span className="phone">{link.customerPhone}</span>
                        </div>
                      </td>
                      <td className="amount">₹{link.amount.toFixed(2)}</td>
                      <td>{getStatusBadge(link.status)}</td>
                      <td>
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className={`days-left ${getDaysLeft(link.expiryDate) <= 0 ? 'expired' : ''}`}
                        >
                          {getDaysLeft(link.expiryDate)} days
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedLink(link)}
                          title="View details"
                        >
                          <Icon name="eye" size={14} />
                        </button>
                        {link.status === 'pending' && (
                          <button
                            className="btn-icon success"
                            onClick={() => handleStatusChange(link.id, 'paid')}
                            title="Mark as paid"
                          >
                            <Icon name="check" size={14} />
                          </button>
                        )}
                        {link.status === 'pending' && (
                          <button
                            className="btn-icon danger"
                            onClick={() => handleStatusChange(link.id, 'cancelled')}
                            title="Cancel"
                          >
                            <Icon name="x" size={14} />
                          </button>
                        )}
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDelete(link.id)}
                          title="Delete"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="arrow-left" size={14} />
                </button>
                <span>
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage(p => (p * limit < total ? p + 1 : p))}
                  disabled={page * limit >= total}
                >
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      {selectedLink && (
        <div className="modal-overlay" onClick={() => setSelectedLink(null)}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Link Details</h3>
              <button
                className="btn-close"
                onClick={() => setSelectedLink(null)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Transaction ID</span>
                  <code>{selectedLink.transactionId}</code>
                </div>
                <div className="detail-item">
                  <span className="label">Customer</span>
                  <span>{selectedLink.customerName}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Phone</span>
                  <span>{selectedLink.customerPhone}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Amount</span>
                  <span className="amount">₹{selectedLink.amount.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status</span>
                  {getStatusBadge(selectedLink.status)}
                </div>
                <div className="detail-item">
                  <span className="label">Created</span>
                  <span>{new Date(selectedLink.createdAt).toLocaleString()}</span>
                </div>
                {selectedLink.paidAt && (
                  <div className="detail-item">
                    <span className="label">Paid At</span>
                    <span>{new Date(selectedLink.paidAt).toLocaleString()}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">Expires At</span>
                  <span>{new Date(selectedLink.expiryDate).toLocaleString()}</span>
                </div>
              </div>

              {selectedLink.status === 'pending' && (
                <div className="status-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleStatusChange(selectedLink.id, 'paid')}
                  >
                    <Icon name="check" size={14} />
                    Mark as Paid
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleStatusChange(selectedLink.id, 'cancelled')}
                  >
                    <Icon name="x" size={14} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentLinkHistory;
