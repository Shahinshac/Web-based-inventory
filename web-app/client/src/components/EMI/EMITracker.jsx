/**
 * @file EMITracker.jsx
 * @description Administrative EMI tracking dashboard
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon.jsx';
import { apiGet, apiPatch } from '../../utils/api';
import { formatCurrency0 } from '../../constants';
import './emi.css';

const EMITracker = () => {
  const [emiPlans, setEmiPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEMIPlans();
  }, []);

  const fetchEMIPlans = async () => {
    try {
      setLoading(true);
      // Re-using the admin-side audit logs or a dedicated EMI endpoint if exists
      // If no dedicated admin EMI endpoint, we might need to create one or use existing ones
      const response = await apiGet('/api/admin/emi-plans'); 
      setEmiPlans(response.emiPlans || []);
      setFilteredPlans(response.emiPlans || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch EMI plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = emiPlans;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.billNumber?.includes(searchTerm)
      );
    }

    setFilteredPlans(filtered);
  }, [emiPlans, filterStatus, searchTerm]);

  if (error) {
    return (
      <div className="emi-tracker-container">
        <div className="error-state">
          <Icon name="alert-circle" size={32} />
          <p>{error}</p>
          <button onClick={fetchEMIPlans} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const stats = {
    total: emiPlans.length,
    active: emiPlans.filter(p => p.status === 'active').length,
    closed: emiPlans.filter(p => p.status === 'closed').length,
    defaulted: emiPlans.filter(p => p.status === 'defaulted').length
  };

  return (
    <div className="emi-tracker-container">
      <div className="emi-header">
        <div>
          <h2 className="section-title">💳 EMI Plan Tracker</h2>
          <p className="section-subtitle">Monitor customer installment plans and repayment status</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="emi-stats-grid">
        <div className="emi-stat-card">
          <div className="emi-stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Icon name="credit-card" size={20} /></div>
          <div className="emi-stat-info">
            <span className="emi-stat-label">Total Plans</span>
            <span className="emi-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="emi-stat-card">
          <div className="emi-stat-icon" style={{ background: '#dcfce7', color: '#10b981' }}><Icon name="check-circle" size={20} /></div>
          <div className="emi-stat-info">
            <span className="emi-stat-label">Active</span>
            <span className="emi-stat-value">{stats.active}</span>
          </div>
        </div>
        <div className="emi-stat-card">
          <div className="emi-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Icon name="clock" size={20} /></div>
          <div className="emi-stat-info">
            <span className="emi-stat-label">Closed</span>
            <span className="emi-stat-value">{stats.closed}</span>
          </div>
        </div>
        <div className="emi-stat-card">
          <div className="emi-stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><Icon name="alert-triangle" size={20} /></div>
          <div className="emi-stat-info">
            <span className="emi-stat-label">Defaulted</span>
            <span className="emi-stat-value">{stats.defaulted}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="emi-filters-bar">
        <div className="search-input-wrap">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search by customer or bill number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-select-wrap">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="defaulted">Defaulted</option>
          </select>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="emi-loading">
          <div className="spinner"></div>
          <p>Loading EMI plans...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="emi-empty">
          <Icon name="info" size={48} />
          <p>No EMI plans found matching your criteria</p>
        </div>
      ) : (
        <div className="emi-table-container">
          <table className="emi-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Customer</th>
                <th>Principal</th>
                <th>Tenure</th>
                <th>EMI Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map(plan => (
                <tr key={plan.id || plan._id}>
                  <td className="font-mono">{plan.billNumber}</td>
                  <td>
                    <div className="customer-cell">
                      <span className="name">{plan.customerName}</span>
                      <span className="phone">{plan.customerPhone}</span>
                    </div>
                  </td>
                  <td className="font-bold">{formatCurrency0(plan.principalAmount)}</td>
                  <td>{plan.tenure} Months</td>
                  <td className="text-primary font-bold">{formatCurrency0(plan.monthlyEmi)}</td>
                  <td>
                    <div className="progress-cell">
                      <span>{formatCurrency0(plan.totalPaid)}</span>
                      <div className="progress-bar-mini">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${(plan.totalPaid / (plan.totalAmount || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${plan.status?.toLowerCase()}`}>
                      {plan.status}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn" title="View Details">
                      <Icon name="external-link" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EMITracker;
