import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../Icon';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import SearchBar from '../Common/SearchBar';
import { API, getAuthHeaders } from '../../utils/api';
import { formatCurrency0 } from '../../constants';

export default function Returns({ currentUser, invoices = [], showNotification }) {
  const [returns, setReturns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    billNumber: '',
    customerName: '',
    reason: '',
    items: [{ name: '', quantity: 1, price: 0, productId: '' }]
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validItems = formData.items.filter(i => i.name && i.quantity > 0 && i.price > 0);
    if (validItems.length === 0) {
      showNotification?.('Please add at least one valid return item', 'error');
      return;
    }
    if (!formData.reason.trim()) {
      showNotification?.('Please provide a return reason', 'error');
      return;
    }

    const refundAmount = validItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    try {
      const res = await fetch(API('/api/returns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...formData,
          items: validItems,
          refundAmount,
          userId: currentUser?.id || currentUser?._id,
          username: currentUser?.username
        })
      });

      if (res.ok) {
        showNotification?.('Return processed successfully!', 'success');
        setShowForm(false);
        resetForm();
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

  const resetForm = () => {
    setFormData({
      billNumber: '',
      customerName: '',
      reason: '',
      items: [{ name: '', quantity: 1, price: 0, productId: '' }]
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, price: 0, productId: '' }]
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
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

  const refundTotal = formData.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);

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
        <Button variant="primary" icon="plus" onClick={() => { resetForm(); setShowForm(true); }}>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Return Modal */}
      {showForm && (
        <Modal isOpen={true} title="Process Return" onClose={() => setShowForm(false)} size="large">
          <form onSubmit={handleSubmit} className="feature-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Invoice / Bill Number</label>
                <input
                  type="text"
                  value={formData.billNumber}
                  onChange={e => setFormData(prev => ({ ...prev, billNumber: e.target.value }))}
                  placeholder="e.g. INV-001"
                />
              </div>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={e => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Customer name"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Return *</label>
              <textarea
                value={formData.reason}
                onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe the reason for this return..."
                rows={3}
                required
              />
            </div>

            <div className="return-items-section">
              <div className="section-header">
                <h4>Return Items</h4>
                <Button type="button" variant="secondary" icon="plus" onClick={addItem}>
                  Add Item
                </Button>
              </div>
              {formData.items.map((item, index) => (
                <div key={index} className="return-item-row">
                  <input
                    type="text"
                    placeholder="Product name"
                    value={item.name}
                    onChange={e => updateItem(index, 'name', e.target.value)}
                    className="item-name-input"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    min="1"
                    className="item-qty-input"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price}
                    onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="item-price-input"
                  />
                  <span className="item-total">{formatCurrency0(item.quantity * item.price)}</span>
                  {formData.items.length > 1 && (
                    <button type="button" className="item-remove-btn" onClick={() => removeItem(index)}>
                      <Icon name="x" size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div className="return-total">
                <strong>Total Refund: {formatCurrency0(refundTotal)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" icon="check">Process Return</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
