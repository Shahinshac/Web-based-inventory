/**
 * @file CustomerEMI.jsx
 * @description Customer EMI plans with payment schedule and history
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerEMIPlans, getEMIDetails } from '../../services/customerPortalService';

const CustomerEMI = ({ currentUser }) => {
  const [emiPlans, setEmiPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  useEffect(() => {
    loadEMIPlans();
  }, []);

  const loadEMIPlans = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerEMIPlans(page, pagination.limit);
      setEmiPlans(data.emiPlans || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message || 'Failed to load EMI plans');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (emiId) => {
    try {
      const details = await getEMIDetails(emiId);
      setSelectedPlan(details);
    } catch (err) {
      alert('Failed to load EMI details: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <span className="badge badge-success">Active</span>,
      closed: <span className="badge badge-info">Closed</span>,
      defaulted: <span className="badge badge-danger">Defaulted</span>
    };
    return badges[status] || badges.active;
  };

  const getInstallmentBadge = (status) => {
    const badges = {
      paid: <span className="badge badge-success">Paid</span>,
      pending: <span className="badge badge-warning">Pending</span>,
      partial: <span className="badge badge-info">Partial</span>
    };
    return badges[status] || badges.pending;
  };

  if (loading && emiPlans.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  // Detail View
  if (selectedPlan) {
    return (
      <div className="customer-emi-details">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2 className="portal-card-title">
              <Icon name="credit-card" size={24} />
              EMI Plan Details
            </h2>
            <button
              className="btn-secondary"
              onClick={() => setSelectedPlan(null)}
            >
              <Icon name="arrow-left" size={16} />
              Back to List
            </button>
          </div>

          {/* Summary */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem' 
          }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>Principal Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>
                ₹{selectedPlan.principalAmount.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>Monthly EMI</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>
                ₹{selectedPlan.monthlyEmi.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>Tenure</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>
                {selectedPlan.tenure} months
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#718096' }}>Status</div>
              <div style={{ marginTop: '0.5rem' }}>{getStatusBadge(selectedPlan.status)}</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#718096' }}>Payment Progress</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#2d3748' }}>
                ₹{selectedPlan.totalPaid.toLocaleString()} / ₹{selectedPlan.totalAmount.toLocaleString()}
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '12px', 
              background: '#e2e8f0', 
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${(selectedPlan.totalPaid / selectedPlan.totalAmount) * 100}%`, 
                height: '100%', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>

          {/* Installments */}
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>
            Installment Schedule
          </h3>
          <table className="portal-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {selectedPlan.installments.map((inst) => (
                <tr key={inst.installmentNo}>
                  <td><strong>#{inst.installmentNo}</strong></td>
                  <td>
                    {inst.dueDate 
                      ? new Date(inst.dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : 'N/A'}
                  </td>
                  <td><strong>₹{inst.amount.toLocaleString()}</strong></td>
                  <td>₹{inst.paidAmount.toLocaleString()}</td>
                  <td>{getInstallmentBadge(inst.status)}</td>
                  <td>
                    {inst.paidDate 
                      ? new Date(inst.paidDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="customer-emi">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="credit-card" size={24} />
            My EMI Plans
          </h2>
        </div>

        {error && (
          <div className="error-message">
            <Icon name="alert-circle" size={20} />
            <span>{error}</span>
          </div>
        )}

        {emiPlans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <p>No EMI plans yet</p>
          </div>
        ) : (
          <>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Bill ID</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Monthly EMI</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emiPlans.map((emi) => (
                  <tr key={emi.id}>
                    <td><strong>#{emi.billId.slice(-8)}</strong></td>
                    <td>₹{emi.principalAmount.toLocaleString()}</td>
                    <td>{emi.tenure} months</td>
                    <td><strong>₹{emi.monthlyEmi.toLocaleString()}</strong></td>
                    <td style={{ color: '#22543d' }}>
                      ₹{emi.totalPaid.toLocaleString()}
                    </td>
                    <td style={{ color: '#c53030' }}>
                      ₹{emi.totalPending.toLocaleString()}
                    </td>
                    <td>{getStatusBadge(emi.status)}</td>
                    <td>
                      <button
                        className="btn-primary"
                        onClick={() => handleViewDetails(emi.id)}
                        style={{ padding: '0.5rem 1rem' }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '0.5rem', 
                marginTop: '1.5rem' 
              }}>
                <button
                  className="btn-secondary"
                  onClick={() => loadEMIPlans(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </button>
                <span style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 1rem',
                  color: '#4a5568'
                }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => loadEMIPlans(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerEMI;
