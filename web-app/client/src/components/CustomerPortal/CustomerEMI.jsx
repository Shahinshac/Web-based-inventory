/**
 * @file CustomerEMI.jsx
 * @description Ultra-Premium EMI tracker for customer portal with technical glassmorphic styling
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { fetchCustomerEMIPlans, getEMIDetails, submitPaymentRequest } from '../../services/customerPortalService';
import { formatDateOnlyIST, formatTimestampIST } from '../../utils/dateFormatter';

const CustomerEMI = () => {
  const [emiPlans, setEmiPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });

  // Payment modal state
  const [payingInstallment, setPayingInstallment] = useState(null);
  const [paymentData, setPaymentData] = useState({ method: 'UPI', details: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const data = await getEMIDetails(emiId);
      setSelectedPlan(data);
    } catch (err) {
      setError(err.message || 'Failed to load EMI details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (inst) => {
    setPayingInstallment(inst);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payingInstallment || !selectedPlan) return;

    try {
      setIsSubmitting(true);
      await submitPaymentRequest({
        type: 'emi_payment',
        targetId: selectedPlan.id,
        amount: payingInstallment.amount,
        paymentMethod: paymentData.method,
        paymentDetails: { transactionId: paymentData.details },
        data: { installmentNo: payingInstallment.installmentNo }
      });
      setPayingInstallment(null);
      await handleViewDetails(selectedPlan.id);
      alert('Payment request submitted! Awaiting Admin approval.');
    } catch (err) {
      alert('Failed to submit payment request.');
    } finally {
      setIsSubmitting(false);
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

  // Detail Vie  return (
    <div className="customer-emi-portal">
      {selectedPlan ? (
        <div className="emi-details-view">
          <div className="portal-card">
            <div className="portal-card-header">
              <h2 className="portal-card-title">
                <Icon name="credit-card" size={20} />
                EMI Plan: #{planIdLabel(selectedPlan)}
              </h2>
              <button 
                className="portal-btn details-btn" 
                style={{ 
                  background: '#f1f5f9', 
                  color: '#475569', 
                  border: '1px solid #e2e8f0', 
                  padding: '8px 16px', 
                  borderRadius: '8px', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer' 
                }} 
                onClick={() => setSelectedPlan(null)}
              >
                <Icon name="arrow-left" size={16} />
                <span>BACK TO PLANS</span>
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
                <span>{Math.round(selectedPlan.totalAmount ? Math.min(100, Math.max(0, (selectedPlan.totalPaid / selectedPlan.totalAmount) * 100)) : 0)}%</span>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#6366f1', width: `${selectedPlan.totalAmount ? Math.min(100, Math.max(0, (selectedPlan.totalPaid / selectedPlan.totalAmount) * 100)) : 0}%` }}></div>
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
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPlan.installments || []).map((inst) => {
                    const isPendingApproval = selectedPlan.pendingRequests?.some(
                      r => r.data?.installmentNo === inst.installmentNo
                    );

                    return (
                      <tr key={inst.installmentNo}>
                        <td>{inst.installmentNo}</td>
                        <td>{formatDateOnlyIST(inst.dueDate)}</td>
                        <td style={{ fontWeight: 600 }}>{formatAmount(inst.amount)}</td>
                        <td>
                          <span className={`badge ${inst.status?.toLowerCase() === 'completed' || inst.status?.toLowerCase() === 'paid' ? 'badge-success' : inst.status?.toLowerCase() === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                            {inst.status}
                          </span>
                        </td>
                        <td>{inst.paidDate ? formatTimestampIST(inst.paidDate) : '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {inst.status?.toLowerCase() !== 'completed' && inst.status?.toLowerCase() !== 'paid' && (
                            isPendingApproval ? (
                              <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Awaiting Approval</span>
                            ) : (
                              <button 
                                className="portal-btn renew-btn" 
                                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                onClick={() => handlePayNow(inst)}
                              >
                                PAY NOW
                              </button>
                            )
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
      ) : (
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
                  <div key={emi.id} className="stat-card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', border: '1px solid #e2e8f0' }} onClick={() => handleViewDetails(emi.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>#{planIdLabel(emi)}</span>
                      {getStatusBadge(emi.status)}
                    </div>
                    <div className="stat-value" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{formatAmount(emi.totalAmount)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
                      {emi.tenure} Months @ {formatAmount(emi.monthlyEmi)}/mo
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginBottom: '1rem' }}>
                      <div style={{ height: '100%', background: '#6366f1', width: `${(emi.totalPaid / emi.totalAmount) * 100}%` }}></div>
                    </div>
                    <button 
                      className="portal-btn details-btn" 
                      style={{ 
                        width: '100%', 
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="info" size={14} />
                      <span>VIEW DETAILS</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingInstallment && (
        <div className="portal-modal-overlay" onClick={() => setPayingInstallment(null)}>
          <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="portal-modal-header">
              <h3>Installment Payment</h3>
              <button className="close-btn" onClick={() => setPayingInstallment(null)}><Icon name="x" size={20} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="portal-modal-content">
              <div style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Installment #{payingInstallment.installmentNo} Amount</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1' }}>{formatAmount(payingInstallment.amount)}</div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Payment Method</label>
                <select 
                  value={paymentData.method} 
                  onChange={e => setPaymentData({...paymentData, method: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash at Store</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Transaction ID / Ref</label>
                <input 
                  type="text" 
                  placeholder="Enter payment reference"
                  value={paymentData.details}
                  onChange={e => setPaymentData({...paymentData, details: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  required={paymentData.method !== 'Cash'}
                />
              </div>

              <button 
                type="submit" 
                className="logout-btn" 
                style={{ width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: '0.75rem', fontWeight: 700 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .portal-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .portal-modal {
          background: white;
          width: 90%;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .portal-modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .portal-modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        .close-btn { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; border-radius: 6px; }
        .close-btn:hover { background: #f1f5f9; color: #1e293b; }
        .portal-modal-content { padding: 1.5rem; }
        .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
  </div>
);
};

export default CustomerEMI;
