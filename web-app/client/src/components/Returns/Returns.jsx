import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../Icon';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import SearchBar from '../Common/SearchBar';
import { API, getAuthHeaders } from '../../utils/api';
import { formatCurrency0 } from '../../constants';

export default function Returns({ currentUser, showNotification }) {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Invoice lookup state
  const [billNumber, setBillNumber] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [lookupError, setLookupError] = useState('');
  
  // Selected items for return (index → return quantity)
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchReturns();
    fetchStats();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await fetch(API('/api/returns'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReturns(data);
      }
    } catch (error) {
      console.error('Failed to fetch returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(API('/api/returns/stats'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch return stats:', error);
    }
  };

  const lookupInvoice = async () => {
    if (!billNumber.trim()) {
      setLookupError('Please enter an invoice number');
      return;
    }
    try {
      setLookupLoading(true);
      setLookupError('');
      setInvoiceData(null);
      setSelectedItems({});
      const res = await fetch(API(`/api/returns/lookup-invoice/${encodeURIComponent(billNumber.trim())}`), { 
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceData(data);
      } else {
        const err = await res.json();
        setLookupError(err.error || 'Invoice not found');
      }
    } catch (error) {
      setLookupError('Failed to look up invoice');
    } finally {
      setLookupLoading(false);
    }
  };

  const toggleItemSelection = (index) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[index] !== undefined) {
        delete next[index];
      } else {
        next[index] = invoiceData.items[index].quantity;
      }
      return next;
    });
  };

  const updateReturnQty = (index, qty) => {
    const maxQty = invoiceData.items[index].quantity;
    const val = Math.max(1, Math.min(parseInt(qty) || 1, maxQty));
    setSelectedItems(prev => ({ ...prev, [index]: val }));
  };

  const selectedCount = Object.keys(selectedItems).length;
  const refundTotal = Object.entries(selectedItems).reduce((sum, [idx, qty]) => {
    const item = invoiceData?.items?.[idx];
    return sum + (item ? item.unitPrice * qty : 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCount === 0) {
      showNotification?.('Please select at least one item to return', 'error');
      return;
    }
    if (!reason.trim()) {
      showNotification?.('Please provide a return reason', 'error');
      return;
    }

    const items = Object.entries(selectedItems).map(([idx, qty]) => {
      const item = invoiceData.items[idx];
      return {
        productId: item.productId,
        name: item.productName,
        quantity: qty,
        price: item.unitPrice
      };
    });

    const refundAmount = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    try {
      const res = await fetch(API('/api/returns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          invoiceId: invoiceData.id,
          billNumber: invoiceData.billNumber,
          customerName: invoiceData.customerName,
          items,
          refundAmount,
          reason,
          userId: currentUser?.id || currentUser?._id,
          username: currentUser?.username
        })
      });

      if (res.ok) {
        showNotification?.('Return processed successfully!', 'success');
        closeForm();
        fetchReturns();
        fetchStats();
      } else {
        const err = await res.json();
        showNotification?.(err.error || 'Failed to process return', 'error');
      }
    } catch (error) {
      showNotification?.('Failed to process return', 'error');
    }
  };

  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'superadmin';

  const handleDeleteReturn = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      const res = await fetch(API(`/api/returns/${deleteConfirmId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showNotification?.('Return record deleted successfully', 'success');
        setReturns(prev => prev.filter(r => r.id !== deleteConfirmId));
        fetchStats();
      } else {
        const err = await res.json();
        showNotification?.(err.error || 'Failed to delete return', 'error');
      }
    } catch {
      showNotification?.('Failed to delete return', 'error');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setBillNumber('');
    setInvoiceData(null);
    setSelectedItems({});
    setReason('');
    setLookupError('');
  };

  const filteredReturns = useMemo(() => {
    if (!searchTerm.trim()) return returns;
    const term = searchTerm.toLowerCase();
    return returns.filter(r =>
      r.billNumber?.toLowerCase().includes(term) ||
      r.customerName?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term)
    );
  }, [returns, searchTerm]);

  return (
    <div className="feature-page returns-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <Icon name="rotate-ccw" size={24} />
          <div>
            <h2>Returns & Refunds</h2>
            <p className="feature-page-subtitle">Process product returns and manage refunds</p>
          </div>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setShowForm(true)}>
          New Return
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="feature-summary">
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Icon name="rotate-ccw" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{stats.totalReturns || 0}</span>
            <span className="summary-card-label">Total Returns</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
            <Icon name="dollar-sign" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{formatCurrency0(stats.totalRefunded || 0)}</span>
            <span className="summary-card-label">Total Refunded</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Icon name="calendar" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{stats.todayReturns || 0}</span>
            <span className="summary-card-label">Today's Returns</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Icon name="trending-down" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{formatCurrency0(stats.monthRefunded || 0)}</span>
            <span className="summary-card-label">This Month</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="feature-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search returns by invoice, customer, reason..."
        />
        <span className="feature-count">{filteredReturns.length} returns</span>
      </div>

      {/* Returns Table */}
      <div className="feature-table-container">
        {loading ? (
          <div className="loading-state"><Icon name="loader" size={24} /> Loading returns...</div>
        ) : filteredReturns.length === 0 ? (
          <div className="empty-state">
            <Icon name="rotate-ccw" size={48} />
            <h3>No returns found</h3>
            <p>Process your first return to get started</p>
          </div>
        ) : (
          <table className="feature-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Refund</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Processed By</th>
                {isAdminOrManager && <th style={{ width: 60 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map(ret => (
                <tr key={ret.id}>
                  <td><span className="table-badge">{ret.billNumber || 'N/A'}</span></td>
                  <td>{ret.customerName || 'Walk-in'}</td>
                  <td>
                    {ret.items?.map((item, i) => (
                      <div key={i} className="table-item-line">
                        {item.name} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td className="text-danger">{formatCurrency0(ret.refundAmount)}</td>
                  <td><span className="table-reason">{ret.reason}</span></td>
                  <td>{ret.createdAt ? new Date(ret.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>{ret.processedByUsername || 'N/A'}</td>
                  {isAdminOrManager && (
                    <td>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Delete return record"
                        onClick={() => setDeleteConfirmId(ret.id)}
                      >
                        <Icon name="trash-2" size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <Modal isOpen={true} title="Delete Return Record" onClose={() => setDeleteConfirmId(null)} size="small">
          <div style={{ padding: '8px 0' }}>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this return record?<br />
              <strong>This will reverse the stock restoration</strong> (items will be deducted again).
            </p>
            <div className="form-actions">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" icon="trash-2" onClick={handleDeleteReturn} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Record'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Return Modal */}
      {showForm && (
        <Modal isOpen={true} title="Process Return" onClose={closeForm} size="large">
          <div className="return-modal-content">
            {/* Step 1: Invoice Lookup */}
            <div className="return-lookup-section">
              <label className="return-lookup-label">
                <Icon name="search" size={16} />
                Enter Invoice Number
              </label>
              <div className="return-lookup-row">
                <input
                  type="text"
                  value={billNumber}
                  onChange={e => { setBillNumber(e.target.value); setLookupError(''); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), lookupInvoice())}
                  placeholder="e.g. INV-2026-0001"
                  className="return-lookup-input"
                  autoFocus
                />
                <Button 
                  type="button" 
                  variant="primary" 
                  icon="search" 
                  onClick={lookupInvoice}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? 'Searching...' : 'Find Invoice'}
                </Button>
              </div>
              {lookupError && (
                <div className="return-lookup-error">
                  <Icon name="alert-circle" size={14} /> {lookupError}
                </div>
              )}
            </div>

            {/* Step 2: Invoice Found - Show Products */}
            {invoiceData && (
              <form onSubmit={handleSubmit}>
                <div className="return-invoice-info">
                  <div className="return-invoice-details">
                    <span><strong>Invoice:</strong> {invoiceData.billNumber}</span>
                    <span><strong>Customer:</strong> {invoiceData.customerName}</span>
                    <span><strong>Date:</strong> {new Date(invoiceData.billDate).toLocaleDateString()}</span>
                    <span><strong>Total:</strong> {formatCurrency0(invoiceData.grandTotal)}</span>
                  </div>
                </div>

                <div className="return-items-section">
                  <h4>Select Items to Return</h4>
                  <div className="return-select-items">
                    {invoiceData.items.map((item, index) => {
                      const isSelected = selectedItems[index] !== undefined;
                      return (
                        <div key={index} className={`return-select-item ${isSelected ? 'selected' : ''}`}>
                          <label className="return-item-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(index)}
                            />
                            <span className="return-item-info">
                              <span className="return-item-name">{item.productName}</span>
                              <span className="return-item-meta">
                                Purchased: {item.quantity} × {formatCurrency0(item.unitPrice)} = {formatCurrency0(item.lineSubtotal)}
                              </span>
                            </span>
                          </label>
                          {isSelected && (
                            <div className="return-qty-control">
                              <label>Return Qty:</label>
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={selectedItems[index]}
                                onChange={e => updateReturnQty(index, e.target.value)}
                                className="return-qty-input"
                              />
                              <span className="return-qty-max">/ {item.quantity}</span>
                              <span className="return-item-refund">
                                Refund: {formatCurrency0(selectedItems[index] * item.unitPrice)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedCount > 0 && (
                  <>
                    <div className="return-total-bar">
                      <span>{selectedCount} item{selectedCount > 1 ? 's' : ''} selected</span>
                      <span className="return-total-amount">Total Refund: {formatCurrency0(refundTotal)}</span>
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label>Reason for Return *</label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Describe the reason for this return..."
                        rows={3}
                        required
                      />
                    </div>

                    <div className="form-actions">
                      <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
                      <Button type="submit" variant="primary" icon="check">Process Return</Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
