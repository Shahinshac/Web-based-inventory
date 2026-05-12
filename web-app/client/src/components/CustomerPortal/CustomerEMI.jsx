/**
 * @file CustomerEMI.jsx
 * @description Ultra-Premium EMI tracker for customer portal with technical glassmorphic styling
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerEMIPlans, getEMIDetails } from '../../services/customerPortalService';
import { formatDateOnlyIST, formatTimestampIST } from '../../utils/dateFormatter';

const CustomerEMI = () => {
  const [emiPlans, setEmiPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    loadEMIPlans(1);
  }, []);

  const loadEMIPlans = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerEMIPlans(page, pagination.limit);
      setEmiPlans(data.emiPlans || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load EMI plans');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (emiId) => {
    try {
      setLoading(true);
      const details = await getEMIDetails(emiId);
      setSelectedPlan(details);
    } catch (err) {
      setError(err.message || 'Failed to load EMI details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'closed') return <span className="badge badge-success">Closed</span>;
    if (s === 'defaulted') return <span className="badge badge-danger">Defaulted</span>;
    return <span className="badge badge-info">Active</span>;
  };

  const formatAmount = (value) => `₹${Number(value || 0).toLocaleString()}`;
  const planIdLabel = (plan) => plan?.billNumber || (plan?.id ? `EMI-${String(plan.id).slice(-6)}` : 'N/A');

  if (loading && emiPlans.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  // Detail View
  if (selectedPlan) {
    const progress = selectedPlan.totalAmount
      ? Math.min(100, Math.max(0, (selectedPlan.totalPaid / selectedPlan.totalAmount) * 100))
      : 0;

    return (
      <div className="emi-details-view">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2 className="portal-card-title">
              <Icon name="credit-card" size={20} />
              EMI Plan: #{planIdLabel(selectedPlan)}
            </h2>
            <button className="logout-btn" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }} onClick={() => setSelectedPlan(null)}>
              <Icon name="arrow-left" size={14} />
              Back to Plans
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Principal Amount</span>
                <span className="stat-value">{formatAmount(selectedPlan.principalAmount)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Monthly EMI</span>
                <span className="stat-value" style={{ color: '#6366f1' }}>{formatAmount(selectedPlan.monthlyEmi)}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Paid / Total</span>
                <span className="stat-value">{formatAmount(selectedPlan.totalPaid)} / {formatAmount(selectedPlan.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Repayment Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#6366f1', width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid Date</th>
                </tr>
              </thead>
              <tbody>
                {(selectedPlan.installments || []).map((inst) => (
                  <tr key={inst.installmentNo}>
                    <td>{inst.installmentNo}</td>
                    <td>{formatDateOnlyIST(inst.dueDate)}</td>
                    <td style={{ fontWeight: 600 }}>{formatAmount(inst.amount)}</td>
                    <td>
                      <span className={`badge ${inst.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {inst.status}
                      </span>
                    </td>
                    <td>{inst.paidDate ? formatTimestampIST(inst.paidDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="customer-emi-list">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="credit-card" size={20} />
            My EMI Plans
          </h2>
        </div>

        {emiPlans.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Icon name="credit-card" size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No active EMI plans found.</p>
          </div>
        ) : (
          <div className="stats-grid">
            {emiPlans.map((emi) => (
              <div key={emi.id} className="stat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }} onClick={() => handleViewDetails(emi.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>#{planIdLabel(emi)}</span>
                  {getStatusBadge(emi.status)}
                </div>
                <div className="stat-value" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{formatAmount(emi.totalAmount)}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                  {emi.tenure} Months @ {formatAmount(emi.monthlyEmi)}/mo
                </div>
                <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#6366f1', width: `${(emi.totalPaid / emi.totalAmount) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerEMI;
