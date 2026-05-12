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

  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchEMIPlans();
  }, []);

  const fetchEMIPlans = async () => {
    try {
      setLoading(true);
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

  const handleViewDetails = (plan) => {
    setSelectedPlan(plan);
  };

  const handleBackToList = () => {
    setSelectedPlan(null);
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

  if (selectedPlan) {
    const progress = (selectedPlan.totalPaid / (selectedPlan.totalAmount || 1)) * 100;
    
    return (
      <div className="emi-tracker-container">
        <div className="emi-header" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={handleBackToList} className="back-btn" style={{ background: '#f1f5f9', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b' }}>
              <Icon name="arrow-left" size={20} />
            </button>
            <div>
              <h2 className="section-title">EMI Details: #{selectedPlan.billNumber}</h2>
              <p className="section-subtitle">Repayment schedule and payment history for {selectedPlan.customerName}</p>
            </div>
          </div>
        </div>

        <div className="emi-stats-grid">
          <div className="emi-stat-card">
            <div className="emi-stat-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><Icon name="user" size={20} /></div>
            <div className="emi-stat-info">
              <span className="emi-stat-label">Customer</span>
              <span className="emi-stat-value" style={{ fontSize: '1.1rem' }}>{selectedPlan.customerName}</span>
              <span className="emi-stat-label">{selectedPlan.customerPhone}</span>
            </div>
          </div>
          <div className="emi-stat-card">
            <div className="emi-stat-icon" style={{ background: '#dcfce7', color: '#10b981' }}><Icon name="rupee" size={20} /></div>
            <div className="emi-stat-info">
              <span className="emi-stat-label">Total Amount</span>
              <span className="emi-stat-value">{formatCurrency0(selectedPlan.totalAmount)}</span>
              <span className="emi-stat-label">Paid: {formatCurrency0(selectedPlan.totalPaid)}</span>
            </div>
          </div>
          <div className="emi-stat-card">
            <div className="emi-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}><Icon name="calendar" size={20} /></div>
            <div className="emi-stat-info">
              <span className="emi-stat-label">Tenure</span>
              <span className="emi-stat-value">{selectedPlan.tenure} Months</span>
              <span className="emi-stat-label">EMI: {formatCurrency0(selectedPlan.monthlyEmi)}</span>
            </div>
          </div>
          <div className="emi-stat-card">
            <div className="emi-stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><Icon name="activity" size={20} /></div>
            <div className="emi-stat-info">
              <span className="emi-stat-label">Progress</span>
              <span className="emi-stat-value">{Math.round(progress)}%</span>
              <div className="progress-bar-mini" style={{ width: '100%', marginTop: '8px' }}>
                <div className="progress-fill" style={{ width: `${progress}%`, height: '6px' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="emi-table-container" style={{ marginTop: '24px' }}>
          <h3 style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', margin: 0 }}>Repayment Schedule</h3>
          <table className="emi-table">
            <thead>
              <tr>
                <th>Inst #</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid Amount</th>
                <th>Paid Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(selectedPlan.installments || []).map(inst => (
                <tr key={inst.installmentNo}>
                  <td>{inst.installmentNo}</td>
                  <td>{new Date(inst.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="font-bold">{formatCurrency0(inst.amount)}</td>
                  <td>{formatCurrency0(inst.paidAmount || 0)}</td>
                  <td>{inst.paidDate ? new Date(inst.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  <td>
                    <span className={`status-badge status-${inst.status?.toLowerCase()}`}>
                      {inst.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
                    <button 
                      className="action-btn" 
                      onClick={() => handleViewDetails(plan)}
                      style={{ 
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 16px', 
                        borderRadius: '8px', 
                        fontWeight: 700, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'transform 0.2s',
                        fontSize: '12px'
                      }}
                    >
                      <Icon name="external-link" size={16} />
                      <span>VIEW DETAILS</span>
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
