/**
 * @file WarrantyTracker.jsx
 * @description Main warranty tracking dashboard
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet, apiPatch } from '../../utils/api';
import WarrantyCard from './WarrantyCard';
import './warranty.css';

const WarrantyTracker = () => {
  const [warranties, setWarranties] = useState([]);
  const [filteredWarranties, setFilteredWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/warranties');
      setWarranties(response.warranties || []);
      setFilteredWarranties(response.warranties || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch warranties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = warranties;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(w => w.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(w =>
        w.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.serialNumber?.includes(searchTerm) ||
        w.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredWarranties(filtered);
  }, [warranties, filterStatus, searchTerm]);

  const handleStatusUpdate = async (warrantyId, newStatus) => {
    try {
      await apiPatch(`/api/warranties/${warrantyId}`, { status: newStatus });
      setWarranties(warranties.map(w =>
        w._id === warrantyId ? { ...w, status: newStatus } : w
      ));
    } catch (err) {
      console.error('Failed to update warranty:', err);
    }
  };

  if (error) {
    return (
      <div className="warranty-container">
        <div className="error-state">
          <Icon name="alert-circle" size={32} />
          <p>{error}</p>
          <button onClick={fetchWarranties} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const stats = {
    total: warranties.length,
    active: warranties.filter(w => w.status === 'active').length,
    expiringSoon: warranties.filter(w => w.status === 'expiring-soon').length,
    expired: warranties.filter(w => w.status === 'expired').length
  };

  return (
    <div className="warranty-container">
      <div className="warranty-header">
        <div>
          <h2 className="section-title">🛡️ Warranty Tracker</h2>
          <p className="section-subtitle">Manage and track all product warranties and claims</p>
        </div>
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} 
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <Icon name="list" size={18} />
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`} 
            onClick={() => setViewMode('cards')}
            title="Card View"
          >
            <Icon name="grid" size={18} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="warranty-stats-grid">
        <div className="w-stat-card">
          <div className="w-stat-icon" style={{ background: '#f1f5f9', color: '#64748b' }}><Icon name="shield" size={20} /></div>
          <div className="w-stat-info">
            <span className="w-stat-label">Total</span>
            <span className="w-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="w-stat-card">
          <div className="w-stat-icon" style={{ background: '#dcfce7', color: '#10b981' }}><Icon name="check-circle" size={20} /></div>
          <div className="w-stat-info">
            <span className="w-stat-label">Active</span>
            <span className="w-stat-value">{stats.active}</span>
          </div>
        </div>
        <div className="w-stat-card">
          <div className="w-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Icon name="clock" size={20} /></div>
          <div className="w-stat-info">
            <span className="w-stat-label">Expiring Soon</span>
            <span className="w-stat-value">{stats.expiringSoon}</span>
          </div>
        </div>
        <div className="w-stat-card">
          <div className="w-stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><Icon name="alert-triangle" size={20} /></div>
          <div className="w-stat-info">
            <span className="w-stat-label">Expired</span>
            <span className="w-stat-value">{stats.expired}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="warranty-filters-bar">
        <div className="search-input-wrap">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search by product, customer, or serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-select-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="expiring-soon">Expiring Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="warranty-loading">
          <div className="spinner"></div>
          <p>Loading warranties...</p>
        </div>
      ) : filteredWarranties.length === 0 ? (
        <div className="warranty-empty">
          <Icon name="info" size={48} />
          <p>No warranties found</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="warranty-table-container">
          <table className="warranty-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Serial Number</th>
                <th>Purchase Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWarranties.map(w => (
                <tr key={w._id}>
                  <td className="font-bold">{w.productName}</td>
                  <td>{w.customerName || 'N/A'}</td>
                  <td className="font-mono">{w.serialNumber || 'N/A'}</td>
                  <td>{new Date(w.purchaseDate).toLocaleDateString('en-IN')}</td>
                  <td>{new Date(w.expiryDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className={`status-badge status-${w.status}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      <button 
                        className="action-btn-mini claim-btn" 
                        onClick={() => handleStatusUpdate(w._id, 'claimed')}
                      >
                        <Icon name="check" size={14} />
                        <span>Claim</span>
                      </button>
                      <button 
                        className="action-btn-mini renew-btn" 
                        onClick={() => handleStatusUpdate(w._id, 'active')}
                      >
                        <Icon name="refresh-cw" size={14} />
                        <span>Renew</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="warranties-grid">
          {filteredWarranties.map(warranty => (
            <WarrantyCard
              key={warranty._id}
              warranty={warranty}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WarrantyTracker;
