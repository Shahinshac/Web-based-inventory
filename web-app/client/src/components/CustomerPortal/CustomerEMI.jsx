import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';
import { emiService } from '../../services/emiService';
import './CustomerEMI.css';

export default function CustomerEMI({ customerId, customerName }) {
  const [emiPlans, setEmiPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [recordingPayment, setRecordingPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Load EMI plans on mount
  useEffect(() => {
    loadEMIPlans();
  }, [customerId, statusFilter]);

  const loadEMIPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const options = statusFilter === 'all' ? { limit: 100 } : { limit: 100, status: statusFilter };
      const response = await emiService.getCustomerEMIPlans(customerId, options);

      if (response.success) {
        setEmiPlans(response.data);
      } else {
        throw new Error('Failed to load EMI plans');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading EMI plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      active: { bg: '#dbeafe', text: '#0284c7', icon: 'clock' },
      closed: { bg: '#dcfce7', text: '#16a34a', icon: 'check-circle' },
      defaulted: { bg: '#fee2e2', text: '#dc2626', icon: 'alert-circle' }
    };
    return colors[status] || colors.active;
  };

  const getInstallmentStatusColor = (status) => {
    const colors = {
      paid: '#10b981',
      partial: '#f59e0b',
      pending: '#6b7280'
    };
    return colors[status] || colors.pending;
  };

  const calculateDaysLeft = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const diff = end - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const handleRecordPayment = async (emiId, installmentNo, dueAmount) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > dueAmount) {
      setError(`Payment cannot exceed due amount of ₹${dueAmount.toLocaleString('en-IN')}`);
      return;
    }

    try {
      const result = await emiService.recordEMIPayment(emiId, {
        installmentNo,
        amount,
        paymentMethod: 'cash',
        notes: 'Payment recorded from customer portal'
      });

      if (result.success) {
        setPaymentAmount('');
        setRecordingPayment(null);
        await loadEMIPlans();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="customer-emi-loading">
        <Icon name="loader" size={32} />
        <span>Loading EMI plans...</span>
      </div>
    );
  }

  return (
    <div className="customer-emi-container">
      <div className="emi-header">
        <div className="emi-title-section">
          <Icon name="credit-card" size={28} />
          <div>
            <h2>EMI Plans</h2>
            <p>Track and manage your EMI agreements</p>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="emi-filters">
        {['all', 'active', 'closed', 'defaulted'].map(status => (
          <button
            key={status}
            className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="emi-error-banner">
          <Icon name="alert-circle" size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Empty State */}
      {emiPlans.length === 0 ? (
        <div className="emi-empty-state">
          <Icon name="credit-card" size={48} />
          <h3>No EMI Plans</h3>
          <p>You haven't taken any EMI yet. Visit our showroom to explore EMI options on your next purchase.</p>
        </div>
      ) : (
        <div className="emi-list">
          {emiPlans.map(plan => {
            const isExpanded = expandedPlanId === plan._id;
            const statusColor = getStatusBadgeColor(plan.status);
            const daysLeft = calculateDaysLeft(plan.endDate);
            const completedInstallments = plan.summary?.completedInstallments || 0;
            const totalInstallments = plan.summary?.totalInstallments || plan.tenure;

            return (
              <div key={plan._id} className="emi-card">
                {/* Card Header */}
                <div
                  className={`emi-card-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan._id)}
                >
                  <div className="emi-card-left">
                    <div className="emi-card-icon" style={{ background: `${statusColor.bg}` }}>
                      <Icon name={statusColor.icon} size={24} style={{ color: statusColor.text }} />
                    </div>
                    <div className="emi-card-info">
                      <h4>EMI Plan - INV {plan.billId.slice(-8)}</h4>
                      <p className="emi-tenure">{plan.tenure} months @ ₹{plan.monthlyEmi.toLocaleString('en-IN')}/month</p>
                      <div className="emi-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(completedInstallments / totalInstallments) * 100}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {completedInstallments}/{totalInstallments} installments paid
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="emi-card-right">
                    <div className="emi-status-badge" style={{ background: statusColor.bg, color: statusColor.text }}>
                      {plan.status}
                    </div>
                    <div className="emi-days-left">
                      {plan.status === 'active' && (
                        <>
                          <Icon name="calendar" size={16} />
                          <span>{daysLeft} days left</span>
                        </>
                      )}
                    </div>
                    <div className="emi-expand-icon">
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} />
                    </div>
                  </div>
                </div>

                {/* Card Content - Expanded */}
                {isExpanded && (
                  <div className="emi-card-content">
                    {/* Plan Summary */}
                    <div className="emi-summary-grid">
                      <div className="summary-item">
                        <span className="label">Principal Amount</span>
                        <span className="value">{formatCurrency0(plan.principalAmount)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Total Paid</span>
                        <span className="value paid">{formatCurrency0(plan.summary?.totalPaid || 0)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Outstanding</span>
                        <span className="value pending">{formatCurrency0(plan.summary?.totalPending || 0)}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Interest Rate</span>
                        <span className="value">{plan.totalInterest === 0 ? '0% (Zero)' : `${plan.totalInterest}%`}</span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="emi-dates">
                      <div className="date-item">
                        <Icon name="calendar" size={16} />
                        <div>
                          <span className="label">Start Date</span>
                          <span className="value">{formatDate(plan.startDate)}</span>
                        </div>
                      </div>
                      <div className="date-item">
                        <Icon name="calendar-check" size={16} />
                        <div>
                          <span className="label">End Date</span>
                          <span className="value">{formatDate(plan.endDate)}</span>
                        </div>
                      </div>
                      {plan.summary?.nextDueDate && (
                        <div className="date-item next-due">
                          <Icon name="alert-circle" size={16} />
                          <div>
                            <span className="label">Next Due</span>
                            <span className="value">{formatDate(plan.summary.nextDueDate)} - ₹{plan.summary.nextDueAmount.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Installments Table */}
                    <div className="emi-installments">
                      <h5>Payment Schedule</h5>
                      <div className="installments-table-wrapper">
                        <table className="installments-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Due Date</th>
                              <th>Amount</th>
                              <th>Paid</th>
                              <th>Status</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.installments.map(inst => {
                              const statusColor = getInstallmentStatusColor(inst.status);
                              const remaining = inst.amount - inst.paidAmount;

                              return (
                                <tr key={inst.installmentNo} className={`inst-${inst.status}`}>
                                  <td className="inst-no">#{inst.installmentNo}</td>
                                  <td className="inst-date">{formatDate(inst.dueDate)}</td>
                                  <td className="inst-amount">₹{inst.amount.toLocaleString('en-IN')}</td>
                                  <td className="inst-paid">
                                    {inst.paidAmount > 0 ? (
                                      <span className="paid-badge">₹{inst.paidAmount.toLocaleString('en-IN')}</span>
                                    ) : (
                                      <span className="unpaid-badge">—</span>
                                    )}
                                  </td>
                                  <td className="inst-status">
                                    <span className="status-badge" style={{ color: statusColor }}>
                                      {inst.status}
                                    </span>
                                  </td>
                                  <td className="inst-action">
                                    {inst.status !== 'paid' && plan.status === 'active' && (
                                      <button
                                        className="pay-btn"
                                        onClick={() => setRecordingPayment({ emiId: plan._id, installmentNo: inst.installmentNo, remaining })}
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Recording Modal */}
      {recordingPayment && (
        <div className="modal-overlay" onClick={() => setRecordingPayment(null)}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="close-btn" onClick={() => setRecordingPayment(null)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="payment-info">
                <p className="info-text">Installment #{recordingPayment.installmentNo}</p>
                <p className="remaining-text">
                  Remaining Amount: <strong>{formatCurrency0(recordingPayment.remaining)}</strong>
                </p>
              </div>

              <div className="payment-input-group">
                <label>Amount to Pay</label>
                <div className="input-wrapper">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    max={recordingPayment.remaining}
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setRecordingPayment(null)}
                >
                  Cancel
                </button>
                <button
                  className="submit-btn"
                  onClick={() =>
                    handleRecordPayment(
                      recordingPayment.emiId,
                      recordingPayment.installmentNo,
                      recordingPayment.remaining
                    )
                  }
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
