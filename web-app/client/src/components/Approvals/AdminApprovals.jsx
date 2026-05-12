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
      await apiPatch(`/api/admin/payment-requests/${id}`, { status, notes });
      await fetchRequests();
    } catch (error) {
      alert('Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="admin-approvals">
      <header className="page-header">
        <h1><Icon name="check-circle" size={24} /> Payment Approvals</h1>
        <div className="header-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="status-select">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </header>

      <div className="approvals-content">
        {loading ? (
          <div className="loading-state">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">No requests found</div>
        ) : (
          <div className="approvals-grid">
            {requests.map(req => (
              <div key={req._id} className={`approval-card ${req.status}`}>
                <div className="card-header">
                  <span className={`type-badge ${req.type}`}>
                    {req.type === 'warranty_renewal' ? 'Warranty Renewal' : 'EMI Payment'}
                  </span>
                  <span className={`status-badge ${req.status}`}>{req.status}</span>
                </div>
                
                <div className="card-body">
                  <div className="info-row">
                    <label>Customer:</label>
                    <span>{req.customerName} ({req.customerPhone})</span>
                  </div>
                  <div className="info-row">
                    <label>Amount:</label>
                    <span className="amount">₹{req.amount}</span>
                  </div>
                  <div className="info-row">
                    <label>Method:</label>
                    <span>{req.paymentMethod}</span>
                  </div>
                  {req.paymentDetails?.transactionId && (
                    <div className="info-row">
                      <label>Txn ID:</label>
                      <code>{req.paymentDetails.transactionId}</code>
                    </div>
                  )}
                  <div className="info-row">
                    <label>Date:</label>
                    <span>{formatDateOnlyIST(req.createdAt)}</span>
                  </div>
                  {req.type === 'warranty_renewal' && (
                    <div className="info-row">
                      <label>Period:</label>
                      <span>{req.data?.years} Year(s)</span>
                    </div>
                  )}
                  {req.type === 'emi_payment' && (
                    <div className="info-row">
                      <label>Installment:</label>
                      <span>#{req.data?.installmentNo}</span>
                    </div>
                  )}
                </div>

                {req.status === 'pending' && (
                  <div className="card-actions">
                    <button 
                      className="approve-btn" 
                      onClick={() => handleAction(req._id, 'approved')}
                      disabled={processingId === req._id}
                    >
                      {processingId === req._id ? '...' : 'Approve'}
                    </button>
                    <button 
                      className="reject-btn" 
                      onClick={() => handleAction(req._id, 'rejected')}
                      disabled={processingId === req._id}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {req.adminNotes && (
                  <div className="admin-notes">
                    <label>Admin Notes:</label>
                    <p>{req.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-approvals { padding: 2rem; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .status-select { padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .approvals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
        .approval-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1.5rem; transition: all 0.2s; }
        .approval-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .type-badge { font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
        .type-badge.warranty_renewal { background: #e0e7ff; color: #4338ca; }
        .type-badge.emi_payment { background: #fef3c7; color: #92400e; }
        .status-badge { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
        .status-badge.pending { color: #f59e0b; }
        .status-badge.approved { color: #10b981; }
        .status-badge.rejected { color: #ef4444; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem; }
        .info-row label { color: #64748b; }
        .amount { font-weight: 800; color: #1e293b; font-size: 1rem; }
        .card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.5rem; }
        .approve-btn { background: #10b981; color: white; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .reject-btn { background: #f1f5f9; color: #ef4444; border: 1px solid #fee2e2; padding: 0.75rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .admin-notes { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #e2e8f0; }
        .admin-notes label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .admin-notes p { margin: 4px 0 0; font-size: 0.8rem; color: #475569; }
      `}</style>
    </div>
  );
};

export default AdminApprovals;
