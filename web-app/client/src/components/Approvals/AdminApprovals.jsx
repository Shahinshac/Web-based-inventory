import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { API, apiGet, apiPatch, getAuthHeaders } from '../../utils/api';
import { formatDateOnlyIST } from '../../utils/dateFormatter';

const AdminApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/admin/payment-requests?status=${filter}`);
      setRequests(res.requests || []);
    } catch (error) {
      console.error('Fetch requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
    const notes = prompt(`Enter notes for this ${status}:`);
    if (notes === null) return;

    try {
      setProcessingId(id);
      const res = await apiPatch(`/api/admin/payment-requests/${id}`, { status, notes });
      if (res.success) {
        await fetchRequests();
      } else {
        alert(res.error || `Failed to ${status} request`);
      }
    } catch (error) {
      alert(`Failed to ${status} request: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-approvals">
      <div className="page-header-premium">
        <div className="header-main-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => window.location.hash = '#dashboard'} 
              className="header-back-btn"
              style={{ 
                background: 'white', 
                border: '1px solid #e2e8f0', 
                padding: '10px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              title="Back to Dashboard"
            >
              <Icon name="arrow-left" size={20} />
            </button>
            <div className="header-title-section">
              <h1><Icon name="check-circle" size={28} stroke="#6366f1" /> Payment Requests</h1>
              <p>Review and process warranty renewals and EMI installments</p>
            </div>
          </div>
          
          <div className="header-actions-premium">
            <button 
              className={`refresh-btn-premium ${loading ? 'spinning' : ''}`} 
              onClick={fetchRequests}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '13px',
                color: '#6366f1',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <Icon name="refresh-cw" size={18} />
              <span>{loading ? 'SYNCING...' : 'REFRESH'}</span>
            </button>
          </div>
        </div>
        
        <div className="filter-section-premium">
          <div className="filter-label">
            <Icon name="filter" size={16} />
            <span>Filter by Status:</span>
          </div>
          <div className="approval-tabs">
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <button
                key={status}
                className={`tab-btn ${filter === status ? 'active' : ''} ${status}`}
                onClick={() => setFilter(status)}
              >
                <span className="status-indicator"></span>
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status === 'pending' && requests.length > 0 && filter === 'pending' && (
                  <span className="count-badge pulse">{requests.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="approvals-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Fetching requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-approvals">
            <Icon name="inbox" size={64} stroke="#cbd5e1" />
            <h3>No {filter} requests</h3>
            <p>All caught up! No payment requests are waiting for your action.</p>
          </div>
        ) : (
          <div className="approvals-grid">
            {requests.map(req => (
              <div key={req._id} className={`approval-card-premium ${req.status}`}>
                <div className="card-status-bar"></div>
                <div className="card-top">
                  <div className={`type-tag ${req.type}`}>
                    <Icon name={req.type === 'warranty_renewal' ? 'shield' : 'credit-card'} size={14} />
                    {req.type === 'warranty_renewal' ? 'Warranty' : 'EMI'}
                  </div>
                  <span className={`status-text ${req.status}`}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="card-main">
                  <div className="customer-info">
                    <h3>{req.customerName}</h3>
                    <p><Icon name="phone" size={14} /> {req.customerPhone}</p>
                  </div>
                  
                  <div className="amount-display">
                    <span className="label">REQUESTED AMOUNT</span>
                    <span className="value">₹{Number(req.amount).toLocaleString()}</span>
                  </div>

                  <div className="details-box">
                    <div className="detail-item">
                      <span className="label">Method</span>
                      <span className="val">{req.paymentMethod}</span>
                    </div>
                    {req.paymentDetails?.transactionId && (
                      <div className="detail-item">
                        <span className="label">Ref ID</span>
                        <span className="val truncate">{req.paymentDetails.transactionId}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="label">Submitted</span>
                      <span className="val">{formatDateOnlyIST(req.createdAt)}</span>
                    </div>
                    {req.type === 'warranty_renewal' && (
                      <div className="detail-item">
                        <span className="label">Extension</span>
                        <span className="val">{req.data?.years} Year(s)</span>
                      </div>
                    )}
                    {req.type === 'emi_payment' && (
                      <div className="detail-item">
                        <span className="label">Inst. No</span>
                        <span className="val">#{req.data?.installmentNo}</span>
                      </div>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="card-footer-actions">
                    <button 
                      className="btn-reject" 
                      onClick={() => handleAction(req._id, 'rejected')}
                      disabled={processingId === req._id}
                    >
                      Reject
                    </button>
                    <button 
                      className="btn-approve" 
                      onClick={() => handleAction(req._id, 'approved')}
                      disabled={processingId === req._id}
                    >
                      {processingId === req._id ? 'Processing...' : 'Approve Payment'}
                    </button>
                  </div>
                )}

                {req.adminNotes && (
                  <div className="admin-notes-section">
                    <span className="label">Admin Feedback</span>
                    <p>{req.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-approvals { padding: 2rem; background: #f8fafc; min-height: 100vh; }
        
        .page-header-premium { 
          margin-bottom: 2.5rem; 
          display: flex; 
          flex-direction: column; 
          gap: 1.5rem;
        }
        
        .header-title-section h1 { 
          font-size: 1.875rem; 
          font-weight: 800; 
          color: #1e293b; 
          display: flex; 
          align-items: center; 
          gap: 0.75rem;
          margin: 0 0 0.5rem 0;
        }
        
        .header-title-section p { color: #64748b; margin: 0; }

        .filter-section-premium {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          color: #475569;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .approval-tabs {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }

        .tab-btn {
          padding: 0.5rem 1.25rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
        }

        .tab-btn:hover { color: #1e293b; background: rgba(255, 255, 255, 0.5); }
        
        .tab-btn.active {
          background: white;
          color: #1e293b;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .tab-btn.active.pending { color: #d97706; }
        .tab-btn.active.approved { color: #059669; }
        .tab-btn.active.rejected { color: #dc2626; }
        .tab-btn.active.all { color: #6366f1; }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #cbd5e1;
          transition: all 0.2s;
        }

        .pending .status-indicator { background: #f59e0b; }
        .approved .status-indicator { background: #10b981; }
        .rejected .status-indicator { background: #ef4444; }
        .all .status-indicator { background: #6366f1; }

        .tab-btn.active .status-indicator {
          transform: scale(1.2);
          box-shadow: 0 0 8px currentColor;
        }

        .count-badge {
          background: #ef4444;
          color: white;
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 20px;
          font-weight: 800;
        }

        .pulse {
          animation: pulse-animation 2s infinite;
        }

        @keyframes pulse-animation {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .loading-container, .empty-approvals {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 0;
          text-align: center;
        }

        .empty-approvals h3 { margin: 1rem 0 0.5rem 0; color: #1e293b; }
        .empty-approvals p { color: #64748b; }

        .approvals-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
          gap: 1.5rem; 
        }

        .approval-card-premium {
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .approval-card-premium:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .card-status-bar { height: 4px; width: 100%; background: #e2e8f0; }
        .pending .card-status-bar { background: #f59e0b; }
        .approved .card-status-bar { background: #10b981; }
        .rejected .card-status-bar { background: #ef4444; }

        .card-top { 
          padding: 1.25rem 1.25rem 0.75rem; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }

        .type-tag {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .type-tag.warranty_renewal { background: #e0e7ff; color: #4338ca; }
        .type-tag.emi_payment { background: #fef3c7; color: #92400e; }

        .status-text { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; }
        .status-text.pending { color: #f59e0b; }
        .status-text.approved { color: #10b981; }
        .status-text.rejected { color: #ef4444; }

        .card-main { padding: 0 1.25rem 1.25rem; flex: 1; }
        
        .customer-info h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; }
        .customer-info p { 
          margin: 0; 
          color: #64748b; 
          font-size: 0.85rem; 
          display: flex; 
          align-items: center; 
          gap: 4px; 
        }

        .amount-display { margin-top: 1.25rem; }
        .amount-display .label { display: block; font-size: 0.65rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; }
        .amount-display .value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }

        .details-box {
          margin-top: 1.25rem;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .detail-item { display: flex; justify-content: space-between; font-size: 0.8rem; }
        .detail-item .label { color: #94a3b8; }
        .detail-item .val { font-weight: 600; color: #475569; }
        .truncate { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .card-footer-actions {
          padding: 1rem 1.25rem 1.25rem;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 0.75rem;
          background: #fcfcfd;
          border-top: 1px solid #f1f5f9;
        }

        .btn-approve {
          background: #6366f1;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-approve:hover { background: #4f46e5; transform: scale(1.02); }
        .btn-approve:active { transform: scale(0.98); }

        .btn-reject {
          background: white;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 0.75rem;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        
        .btn-reject:hover { background: #fef2f2; }

        .admin-notes-section {
          padding: 1rem 1.25rem;
          background: #fffbeb;
          border-top: 1px solid #fef3c7;
        }

        .admin-notes-section .label { 
          display: block; 
          font-size: 0.65rem; 
          font-weight: 700; 
          color: #d97706; 
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .admin-notes-section p { margin: 0; font-size: 0.8rem; color: #92400e; font-style: italic; }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f1f5f9;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminApprovals;
