import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../Icon';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import SearchBar from '../Common/SearchBar';
import ConfirmDialog from '../Common/ConfirmDialog';
import { API, getAuthHeaders } from '../../utils/api';
import { formatCurrency0 } from '../../constants';

export default function Coupons({ currentUser, showNotification, canEdit = true }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch(API('/api/coupons'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.discountValue) {
      showNotification?.('Code and discount value are required', 'error');
      return;
    }

    try {
      const res = await fetch(API('/api/coupons'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...formData,
          userId: currentUser?.id || currentUser?._id,
          username: currentUser?.username
        })
      });

      if (res.ok) {
        showNotification?.('Coupon created successfully!', 'success');
        setShowForm(false);
        resetForm();
        fetchCoupons();
      } else {
        const err = await res.json();
        showNotification?.(err.error || 'Failed to create coupon', 'error');
      }
    } catch (error) {
      showNotification?.('Failed to create coupon', 'error');
    }
  };

  const toggleCoupon = async (coupon) => {
    try {
      const res = await fetch(API(`/api/coupons/${coupon.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ isActive: !coupon.isActive })
      });
      if (res.ok) {
        showNotification?.(`Coupon ${coupon.isActive ? 'deactivated' : 'activated'}`, 'success');
        fetchCoupons();
      }
    } catch (error) {
      showNotification?.('Failed to update coupon', 'error');
    }
  };

  const handleDelete = async (coupon) => {
    try {
      const res = await fetch(
        API(`/api/coupons/${coupon.id}?userId=${currentUser?.id || currentUser?._id}&username=${currentUser?.username}`),
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      if (res.ok) {
        showNotification?.('Coupon deleted', 'success');
        fetchCoupons();
      }
    } catch (error) {
      showNotification?.('Failed to delete coupon', 'error');
    }
    setDeleteConfirm(null);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minPurchase: '',
      maxDiscount: '',
      usageLimit: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: ''
    });
  };

  const filteredCoupons = useMemo(() => {
    if (!searchTerm.trim()) return coupons;
    const term = searchTerm.toLowerCase();
    return coupons.filter(c =>
      c.code?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    );
  }, [coupons, searchTerm]);

  // Stats
  const activeCoupons = coupons.filter(c => c.isActive).length;
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="feature-page coupons-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <Icon name="tag" size={24} />
          <div>
            <h2>Coupons & Discounts</h2>
            <p className="feature-page-subtitle">Create and manage discount coupons</p>
          </div>
        </div>
        {canEdit && (
          <Button variant="primary" icon="plus" onClick={() => { resetForm(); setShowForm(true); }}>
            Create Coupon
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="feature-summary">
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Icon name="tag" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{coupons.length}</span>
            <span className="summary-card-label">Total Coupons</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Icon name="check-circle" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{activeCoupons}</span>
            <span className="summary-card-label">Active</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Icon name="shopping-bag" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{totalUsed}</span>
            <span className="summary-card-label">Times Used</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <Icon name="x-circle" size={20} />
          </div>
          <div className="summary-card-data">
            <span className="summary-card-value">{coupons.length - activeCoupons}</span>
            <span className="summary-card-label">Inactive</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="feature-toolbar">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search coupons by code or description..."
        />
        <span className="feature-count">{filteredCoupons.length} coupons</span>
      </div>

      {/* Coupons Grid */}
      <div className="feature-table-container">
        {loading ? (
          <div className="loading-state"><Icon name="loader" size={24} /> Loading coupons...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="empty-state">
            <Icon name="tag" size={48} />
            <h3>No coupons found</h3>
            <p>Create your first discount coupon</p>
          </div>
        ) : (
          <div className="coupons-grid">
            {filteredCoupons.map(coupon => (
              <div key={coupon.id} className={`coupon-card ${!coupon.isActive ? 'coupon-inactive' : ''}`}>
                <div className="coupon-card-header">
                  <div className="coupon-code">{coupon.code}</div>
                  <div className={`coupon-status ${coupon.isActive ? 'active' : 'inactive'}`}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="coupon-discount">
                  {coupon.discountType === 'percentage'
                    ? `${coupon.discountValue}% OFF`
                    : `${formatCurrency0(coupon.discountValue)} OFF`
                  }
                </div>
                {coupon.description && (
                  <p className="coupon-description">{coupon.description}</p>
                )}
                <div className="coupon-details">
                  {coupon.minPurchase > 0 && (
                    <span>Min: {formatCurrency0(coupon.minPurchase)}</span>
                  )}
                  {coupon.maxDiscount && (
                    <span>Max: {formatCurrency0(coupon.maxDiscount)}</span>
                  )}
                  {coupon.usageLimit && (
                    <span>Used: {coupon.usedCount || 0}/{coupon.usageLimit}</span>
                  )}
                  {coupon.validUntil && (
                    <span>Expires: {new Date(coupon.validUntil).toLocaleDateString()}</span>
                  )}
                </div>
                {canEdit && (
                  <div className="coupon-actions">
                    <button
                      className={`coupon-toggle-btn ${coupon.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => toggleCoupon(coupon)}
                    >
                      <Icon name={coupon.isActive ? 'pause' : 'play'} size={14} />
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="coupon-delete-btn" onClick={() => setDeleteConfirm(coupon)}>
                      <Icon name="trash-2" size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showForm && (
        <Modal title="Create Coupon" onClose={() => setShowForm(false)} size="large">
          <form onSubmit={handleSubmit} className="feature-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label>Coupon Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SAVE20"
                  required
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Discount Type *</label>
                <select
                  value={formData.discountType}
                  onChange={e => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Discount Value *</label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={e => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                  placeholder={formData.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 500'}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Min Purchase Amount</label>
                <input
                  type="number"
                  value={formData.minPurchase}
                  onChange={e => setFormData(prev => ({ ...prev, minPurchase: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Max Discount Amount</label>
                <input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={e => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                  placeholder="No limit"
                  min="0"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Usage Limit</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={e => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" variant="primary" icon="check">Create Coupon</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Delete Coupon"
          message={`Delete coupon "${deleteConfirm.code}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
