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
        w.serialNumber?.includes(searchTerm)
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
          <Icon name="alert" size={32} />
          <p>{error}</p>
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
          <h2>Warranty Tracker</h2>
          <p>Manage and track all product warranties</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="warranty-stats">
        <div className="stat-box">
          <p className="stat-label">Total Warranties</p>
          <p className="stat-value">{stats.total}</p>
        </div>
        <div className="stat-box active">
          <p className="stat-label">Active</p>
          <p className="stat-value">{stats.active}</p>
        </div>
        <div className="stat-box warning">
          <p className="stat-label">Expiring Soon</p>
          <p className="stat-value">{stats.expiringSoon}</p>
        </div>
        <div className="stat-box danger">
          <p className="stat-label">Expired</p>
          <p className="stat-value">{stats.expired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="warranty-filters">
        <div className="search-box">
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Search by product or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Warranties</option>
          <option value="active">Active</option>
          <option value="expiring-soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Warranties Grid */}
      {loading ? (
        <div className="loading-state">Loading warranties...</div>
      ) : filteredWarranties.length === 0 ? (
        <div className="empty-state">
          <Icon name="shield" size={48} />
          <p>No warranties found</p>
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
