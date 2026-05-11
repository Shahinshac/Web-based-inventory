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

  const getInstallmentBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'paid' || s === 'completed') return <span className="badge badge-success">Paid</span>;
    if (s === 'overdue') return <span className="badge badge-danger">Overdue</span>;
    if (s === 'partial') return <span className="badge badge-info">Partial</span>;
    return <span className="badge badge-warning">Pending</span>;
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
        <div className="portal-card glass-card">
          <div className="portal-card-header">
            <div className="title-stack">
              <div className="id-tag">PLAN #{planIdLabel(selectedPlan)}</div>
              <h2 className="portal-card-title">EMI Payment Schedule</h2>
            </div>
            <button className="back-btn" onClick={() => setSelectedPlan(null)}>
              <Icon name="arrow-left" size={18} />
              <span>Back to Plans</span>
            </button>
          </div>

          <div className="emi-summary-grid">
            <div className="summary-item">
              <span className="label">Principal Amount</span>
              <span className="value">{formatAmount(selectedPlan.principalAmount)}</span>
              <div className="glow-bar"></div>
            </div>
            <div className="summary-item accent-secondary">
              <span className="label">Down Payment</span>
              <span className="value">{formatAmount(selectedPlan.downPayment)}</span>
              <div className="glow-bar"></div>
            </div>
            <div className="summary-item accent-white">
              <span className="label">Monthly Installment</span>
              <span className="value primary">{formatAmount(selectedPlan.monthlyEmi)}</span>
              <div className="glow-bar"></div>
            </div>
            <div className="summary-item">
              <span className="label">Plan Status</span>
              <div className="status-wrap">{getStatusBadge(selectedPlan.status)}</div>
              <div className="glow-bar"></div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-info">
              <div className="progress-label">
                <Icon name="activity" size={16} />
                <span>Repayment Progress</span>
              </div>
              <div className="progress-stats">
                <span className="paid">{formatAmount(selectedPlan.totalPaid)} Paid</span>
                <span className="sep">/</span>
                <span className="total">{formatAmount(selectedPlan.totalAmount)} Total</span>
              </div>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
                <div className="progress-glow"></div>
              </div>
              <div className="progress-text">{Math.round(progress)}% Complete</div>
            </div>
          </div>

          {/* Installments List */}
          <div className="installments-section">
            <h3 className="section-title">Timeline & Installments</h3>
            <div className="portal-table-wrap premium-wrap">
              <table className="portal-table premium-table">
                <thead>
                  <tr>
                    <th>Inst. #</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPlan.installments || []).map((inst) => (
                    <tr key={inst.installmentNo} className={inst.status === 'overdue' ? 'row-danger' : ''}>
                      <td>
                        <span className="inst-no">{inst.installmentNo}</span>
                      </td>
                      <td>
                        <span className="date-text">{formatDateOnlyIST(inst.dueDate)}</span>
                      </td>
                      <td>
                        <span className="amount-text">{formatAmount(inst.amount)}</span>
                      </td>
                      <td>
                        <span className={`paid-text ${inst.paidAmount > 0 ? 'success' : ''}`}>
                          {formatAmount(inst.paidAmount)}
                        </span>
                      </td>
                      <td>{getInstallmentBadge(inst.status)}</td>
                      <td>
                        <span className="sub-text">
                          {inst.paidDate ? formatTimestampIST(inst.paidDate) : 'Not Paid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <style jsx>{`
          .emi-details-view { animation: fadeIn 0.4s ease-out; }
          .glass-card { border-top: 4px solid var(--portal-accent); position: relative; }
          .title-stack { display: flex; flex-direction: column; gap: 0.25rem; }
          .id-tag { font-size: 0.7rem; font-weight: 800; color: var(--portal-accent); letter-spacing: 0.1em; }
          
          .back-btn {
            background: var(--portal-glass);
            border: 1px solid var(--portal-border);
            color: white;
            padding: 0.6rem 1.2rem;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
          }
          
          .back-btn:hover { background: var(--portal-accent); border-color: var(--portal-accent); transform: translateX(-4px); }
          
          .emi-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
          }
          
          .summary-item {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--portal-border);
            border-radius: 20px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            position: relative;
            overflow: hidden;
          }
          
          .summary-item .label { font-size: 0.8rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
          .summary-item .value { font-size: 1.5rem; font-weight: 800; color: white; }
          .summary-item .value.primary { color: var(--portal-accent); }
          
          .glow-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: var(--portal-accent);
            opacity: 0.3;
          }
          
          .accent-secondary .glow-bar { background: var(--portal-secondary); }
          .accent-white .glow-bar { background: white; }
          
          .progress-section {
            background: rgba(99, 102, 241, 0.03);
            border: 1px solid rgba(99, 102, 241, 0.1);
            border-radius: 24px;
            padding: 2rem;
            margin-bottom: 3rem;
          }
          
          .progress-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }
          
          .progress-label { display: flex; align-items: center; gap: 0.75rem; font-weight: 700; color: white; }
          .progress-stats { font-weight: 600; font-size: 0.95rem; }
          .progress-stats .paid { color: var(--portal-accent); font-weight: 800; }
          .progress-stats .sep { margin: 0 0.5rem; color: var(--portal-text-dim); }
          
          .progress-bar-container {
            height: 16px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 100px;
            position: relative;
            overflow: visible;
          }
          
          .progress-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--portal-accent), #818cf8);
            border-radius: 100px;
            position: relative;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .progress-glow {
            position: absolute;
            top: 0;
            right: 0;
            width: 20px;
            height: 100%;
            background: white;
            filter: blur(8px);
            opacity: 0.5;
          }
          
          .progress-text {
            position: absolute;
            right: 0;
            top: -24px;
            font-size: 0.75rem;
            font-weight: 800;
            color: var(--portal-accent);
          }
          
          .section-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 1.5rem; color: white; }
          .inst-no { font-weight: 800; color: var(--portal-text-dim); }
          .date-text { font-weight: 600; }
          .amount-text { font-weight: 700; color: white; }
          .paid-text.success { color: #10b981; font-weight: 700; }
          .sub-text { font-size: 0.8rem; color: var(--portal-text-dim); }
          .row-danger td { background: rgba(239, 68, 68, 0.05) !important; }
        `}</style>
      </div>
    );
  }

  // List View
  return (
    <div className="customer-emi-list">
      <div className="portal-card">
        <div className="portal-card-header">
          <h2 className="portal-card-title">
            <Icon name="credit-card" size={24} />
            My EMI Plans
          </h2>
          <button className="refresh-btn" onClick={() => loadEMIPlans(pagination.page)} disabled={loading}>
            <Icon name="refresh-cw" size={16} className={loading ? 'spin' : ''} />
            <span>Sync Data</span>
          </button>
        </div>

        {error && (
          <div className="error-message">
            <Icon name="alert-circle" size={20} />
            <span>{error}</span>
          </div>
        )}

        {emiPlans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <Icon name="credit-card" size={60} />
            </div>
            <p className="empty-title">No Active EMI Plans</p>
            <p className="empty-sub">Your payment plans will appear here once initiated at checkout.</p>
          </div>
        ) : (
          <div className="emi-grid-premium">
            {emiPlans.map((emi) => (
              <div key={emi.id} className="emi-card-premium" onClick={() => handleViewDetails(emi.id)}>
                <div className="emi-card-header">
                  <div className="emi-id">#{planIdLabel(emi)}</div>
                  {getStatusBadge(emi.status)}
                </div>
                
                <div className="emi-card-amount">
                  <span className="label">Total Amount</span>
                  <span className="value">{formatAmount(emi.totalAmount)}</span>
                </div>

                <div className="emi-card-stats">
                  <div className="card-stat">
                    <span className="stat-label">Tenure</span>
                    <span className="stat-value">{emi.tenure} Months</span>
                  </div>
                  <div className="card-stat">
                    <span className="stat-label">Monthly</span>
                    <span className="stat-value primary">{formatAmount(emi.monthlyEmi)}</span>
                  </div>
                </div>

                <div className="emi-card-footer">
                  <div className="mini-progress">
                    <div className="mini-bar" style={{ width: `${(emi.totalPaid / emi.totalAmount) * 100}%` }}></div>
                  </div>
                  <button className="action-btn">
                    <span>Manage Plan</span>
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .refresh-btn {
          background: var(--portal-glass);
          border: 1px solid var(--portal-border);
          color: white;
          padding: 0.6rem 1.2rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .refresh-btn:hover { background: rgba(255, 255, 255, 0.1); transform: rotate(5deg); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .emi-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .emi-card-premium {
          background: var(--portal-card-bg);
          border: 1px solid var(--portal-border);
          border-radius: 24px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .emi-card-premium:hover {
          transform: translateY(-8px);
          border-color: var(--portal-accent);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 15px var(--portal-accent-glow);
        }

        .emi-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .emi-id { font-family: monospace; font-weight: 800; color: var(--portal-text-dim); }

        .emi-card-amount {
          display: flex;
          flex-direction: column;
          margin-bottom: 1.5rem;
        }

        .emi-card-amount .label { font-size: 0.75rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
        .emi-card-amount .value { font-size: 1.8rem; font-weight: 800; color: white; }

        .emi-card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .card-stat { display: flex; flex-direction: column; gap: 0.25rem; }
        .card-stat .stat-label { font-size: 0.65rem; font-weight: 700; color: var(--portal-text-dim); text-transform: uppercase; }
        .card-stat .stat-value { font-weight: 700; color: white; }
        .card-stat .stat-value.primary { color: var(--portal-accent); }

        .emi-card-footer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .mini-progress {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          overflow: hidden;
        }

        .mini-bar {
          height: 100%;
          background: var(--portal-accent);
          border-radius: 10px;
          box-shadow: 0 0 10px var(--portal-accent);
        }

        .action-btn {
          width: 100%;
          background: transparent;
          border: 1px solid var(--portal-border);
          color: white;
          padding: 0.75rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 0.85rem;
          transition: all 0.3s;
        }

        .emi-card-premium:hover .action-btn {
          background: var(--portal-accent);
          border-color: var(--portal-accent);
        }

        .empty-icon-wrap {
          color: var(--portal-text-dim);
          opacity: 0.3;
          margin-bottom: 1.5rem;
        }

        .empty-title { font-size: 1.5rem; font-weight: 800; color: white; margin-bottom: 0.5rem; }
        .empty-sub { color: var(--portal-text-dim); max-width: 300px; margin: 0 auto; }
      `}</style>
    </div>
  );
};

export default CustomerEMI;
