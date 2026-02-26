import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../Icon';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import SearchBar from '../Common/SearchBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { API, getAuthHeaders } from '../../utils/api';
import { formatCurrency0 } from '../../constants';

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salary', 'Transport', 'Maintenance', 
  'Supplies', 'Marketing', 'Insurance', 'Tax', 'General'
];

export default function Expenses({ currentUser, showNotification, canEdit = true, canDelete = true }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'General',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(API('/api/expenses'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) {
      showNotification?.('Description and amount are required', 'error');
      return;
    }

    try {
      const res = await fetch(API('/api/expenses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          userId: currentUser?.id || currentUser?._id,
          username: currentUser?.username
        })
      });

      if (res.ok) {
        showNotification?.('Expense added successfully!', 'success');
        setShowForm(false);
        resetForm();
        fetchExpenses();
      } else {
        const err = await res.json();
        showNotification?.(err.error || 'Failed to add expense', 'error');
      }
    } catch (error) {
      showNotification?.('Failed to add expense', 'error');
    }
  };

  const handleDelete = async (expense) => {
    try {
      const res = await fetch(
        API(`/api/expenses/${expense.id}?userId=${currentUser?.id || currentUser?._id}&username=${currentUser?.username}`),
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      if (res.ok) {
        showNotification?.('Expense deleted', 'success');
        fetchExpenses();
      }
    } catch (error) {
      showNotification?.('Failed to delete expense', 'error');
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'General',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.description?.toLowerCase().includes(term) ||
        e.category?.toLowerCase().includes(term)
      );
    }
    if (filterCategory) {
      result = result.filter(e => e.category === filterCategory);
    }
    return result;
  }, [expenses, searchTerm, filterCategory]);

  // Stats
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthTotal = thisMonth.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Category breakdown
  const categoryTotals = useMemo(() => {
    const totals = {};
    expenses.forEach(e => {
      totals[e.category || 'General'] = (totals[e.category || 'General'] || 0) + (e.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  return (
    <div className="feature-page expenses-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <Icon name="credit-card" size={24} />
          <div>
            <h2>Expense Tracking</h2>
            <p className="feature-page-subtitle">Track and manage business expenses</p>
          </div>
        </div>
        {canEdit && (
          <Button variant="primary" icon="plus" onClick={() => { resetForm(); setShowForm(true); }}>
            Add Expense
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="feature-summary">
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <Icon name="trending-down" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{formatCurrency0(totalExpenses)}</span>
            <span className="summary-card-label">Total Expenses</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Icon name="calendar" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{formatCurrency0(monthTotal)}</span>
            <span className="summary-card-label">This Month</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Icon name="hash" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{expenses.length}</span>
            <span className="summary-card-label">Total Entries</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Icon name="layers" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{categoryTotals.length}</span>
            <span className="summary-card-label">Categories</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryTotals.length > 0 && (
        <div className="category-breakdown">
          <h4>Category Breakdown</h4>
          <div className="category-bars">
            {categoryTotals.slice(0, 5).map(([cat, total]) => (
              <div key={cat} className="category-bar-item">
                <div className="category-bar-header">
                  <span className="category-bar-name">{cat}</span>
                  <span className="category-bar-amount">{formatCurrency0(total)}</span>
                </div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${(total / totalExpenses) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="feature-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search expenses..."
        />
        <select
          className="feature-filter-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="feature-count">{filteredExpenses.length} expenses</span>
      </div>

      {/* Expenses Table */}
      <div className="feature-table-container">
        {loading ? (
          <div className="loading-state"><Icon name="loader" size={24} /> Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <Icon name="credit-card" size={48} />
            <h3>No expenses found</h3>
            <p>Start tracking your business expenses</p>
          </div>
        ) : (
          <table className="feature-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Added By</th>
                {canDelete && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.description}</td>
                  <td><span className="table-badge category-badge">{exp.category}</span></td>
                  <td className="text-danger">{formatCurrency0(exp.amount)}</td>
                  <td>{exp.date ? new Date(exp.date).toLocaleDateString() : 'N/A'}</td>
                  <td>{exp.createdByUsername || 'N/A'}</td>
                  {canDelete && (
                    <td>
                      <button className="table-action-btn danger" onClick={() => setDeleteConfirm(exp)} title="Delete">
                        <Icon name="trash-2" size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <Modal title="Add Expense" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="feature-form">
            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What was this expense for?"
                required
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" icon="check">Add Expense</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Expense"
          message={`Delete "${deleteConfirm.description}" (${formatCurrency0(deleteConfirm.amount)})?`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
