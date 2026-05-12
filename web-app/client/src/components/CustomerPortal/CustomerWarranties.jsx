/**
 * @file CustomerWarranties.jsx
 * @description Ultra-Premium Customer warranty tracker with high-octane technical styling
 */

import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import PaymentQRModal from '../Common/PaymentQRModal';
import { fetchCustomerWarranties, getWarrantyDetails, submitPaymentRequest, linkWarrantyByInvoice } from '../../services/customerPortalService';
import { formatDateOnlyIST, formatTimestampIST } from '../../utils/dateFormatter';

const CustomerWarranties = () => {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filter, setFilter] = useState('all');
  const [now, setNow] = useState(() => new Date());

  // Modal states
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalWarranty, setRenewalWarranty] = useState(null);
  const [renewalData, setRenewalData] = useState({ years: 1, paymentMethod: 'UPI', details: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimWarranty, setClaimWarranty] = useState(null);
  const [claimData, setClaimData] = useState({ description: '' });

  useEffect(() => {
    loadWarranties(1);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return formatDateOnlyIST(value);
  };

  const loadWarranties = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerWarranties(page, pagination.limit);
      setWarranties(data.warranties || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load warranties');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      setLoading(true);
      const data = await getWarrantyDetails(id);
      setSelectedWarranty(data);
    } catch (err) {
      setError('Failed to load warranty details');
    } finally {
      setLoading(false);
    }
  };

  const handleRenewClick = (warranty) => {
    setRenewalWarranty(warranty);
    setIsRenewing(true);
  };

  const handleRenewalSubmit = async (e) => {
    e.preventDefault();
    if (!renewalWarranty) return;

    try {
      setIsSubmitting(true);
      await submitPaymentRequest({
        type: 'warranty_renewal',
        targetId: renewalWarranty.id,
        amount: 999 * renewalData.years, // Default fallback price for now
        paymentMethod: renewalData.paymentMethod,
        paymentDetails: { transactionId: renewalData.details },
        data: { years: renewalData.years }
      });
      setIsRenewing(false);
      setRenewalWarranty(null);
      await loadWarranties(pagination.page);
      alert('Renewal request submitted! Awaiting Admin approval.');
    } catch (err) {
      alert('Failed to submit renewal request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimClick = (warranty) => {
    setClaimWarranty(warranty);
    setIsClaiming(true);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimWarranty) return;

    try {
      setIsSubmitting(true);
      await submitPaymentRequest({
        type: 'warranty_claim',
        targetId: claimWarranty.id,
        amount: 0,
        paymentMethod: 'Other',
        paymentDetails: { notes: claimData.description },
        data: { issue: claimData.description }
      });
      setIsClaiming(false);
      setClaimWarranty(null);
      setClaimData({ description: '' });
      await loadWarranties(pagination.page);
      alert('Warranty claim submitted! Our team will review and contact you.');
    } catch (err) {
      alert('Failed to submit claim request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isLinking, setIsLinking] = useState(false);
  const [linkInvoiceNo, setLinkInvoiceNo] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'active') return <span className="badge badge-success"><Icon name="shield-check" size={10} /> Active (Protected)</span>;
    if (s === 'expiring_soon') return <span className="badge badge-warning"><Icon name="clock" size={10} /> Expiring Soon (Renew Now)</span>;
    if (s === 'expired') return <span className="badge badge-danger"><Icon name="shield-off" size={10} /> Expired (Protection Ended)</span>;
    return <span className="badge badge-info">{s}</span>;
  };

  const handleLinkWarranty = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    if (!linkInvoiceNo.trim()) return;

    try {
      setIsLinking(true);
      const response = await linkWarrantyByInvoice(linkInvoiceNo);
      await loadWarranties(1);
      setLinkSuccess(response.message || 'Warranty linked successfully!');
      setLinkInvoiceNo('');
      setTimeout(() => setLinkSuccess(''), 5000);
    } catch (err) {
      setLinkError(err.message || 'Failed to link warranty. Please check the invoice number.');
    } finally {
      setIsLinking(false);
    }
  };

  if (loading && warranties.length === 0) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="customer-warranties">
      <div className="portal-card">
        <div className="portal-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h2 className="portal-card-title">
            <Icon name="shield" size={20} />
            My Product Warranties
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            List of all products currently covered or previously protected.
          </p>
        </div>

        {/* Link Missing Warranty Section */}
        <div className="link-missing-box" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px dashed #cbd5e1' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="plus-circle" size={16} /> Missing a warranty?
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Enter your invoice number to search and link it to your account.</p>
          <form onSubmit={handleLinkWarranty} style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="e.g. INV-2024-001" 
              value={linkInvoiceNo}
              onChange={(e) => setLinkInvoiceNo(e.target.value)}
              style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <button type="submit" className="logout-btn" style={{ background: '#6366f1', color: 'white', border: 'none', padding: '0.5rem 1rem' }} disabled={isLinking}>
              {isLinking ? 'Searching...' : 'Search & Link'}
            </button>
          </form>
          {linkError && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{linkError}</p>}
          {linkSuccess && <p style={{ color: '#10b981', fontSize: '0.75rem', marginTop: '0.5rem' }}>{linkSuccess}</p>}
        </div>

        {error && (
          <div className="error-message" style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="alert-circle" size={16} />
            <span>{error}</span>
          </div>
        )}

        {warranties.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Icon name="shield-off" size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p>No warranties found for your account.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Try searching by invoice number above.</p>
          </div>
        ) : (
          <div className="portal-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Bill Info</th>
                  <th>Expiry Date</th>
                  <th>Coverage Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warranties.map((warranty) => (
                  <tr key={warranty.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{warranty.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SN: {warranty.serialNumber || 'N/A'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{warranty.invoiceNumber}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(warranty.invoiceDate)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: warranty.daysLeft <= 30 && warranty.status !== 'expired' ? '#f59e0b' : '#1e293b' }}>{formatDate(warranty.expiryDate)}</div>
                      <div style={{ fontSize: '0.75rem', color: warranty.daysLeft <= 30 ? '#ef4444' : '#64748b' }}>
                        {warranty.status === 'expired' ? 'Protection ended' : `${warranty.daysLeft} days left`}
                      </div>
                    </td>
                    <td>{getStatusBadge(warranty.status)}</td>
                      <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {warranty.pendingRequests?.length > 0 ? (
                          <span className="badge badge-warning" style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
                            <Icon name="clock" size={10} /> Awaiting Approval
                          </span>
                        ) : (
                          <>
                            <button 
                              className="portal-btn claim-btn" 
                              onClick={() => handleClaimClick(warranty)}
                              style={{ 
                                background: '#10b981',
                                display: 'flex',
                                fontSize: '0.75rem',
                                padding: '6px 12px'
                              }}
                            >
                              CLAIM
                            </button>
                            <button 
                              className="portal-btn renew-btn" 
                              onClick={() => handleRenewClick(warranty)}
                              style={{ 
                                background: warranty.status === 'expired' ? '#ef4444' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                opacity: 1,
                                display: 'flex',
                                fontSize: '0.75rem',
                                padding: '6px 12px'
                              }}
                            >
                              {warranty.status === 'expired' ? 'RENEW' : 'RENEW'}
                            </button>
                          </>
                        )}
                        <button 
                          className="portal-btn details-btn"
                          style={{ display: 'flex', fontSize: '0.75rem', padding: '6px 12px' }}
                          onClick={() => handleViewDetails(warranty.id)}
                        >
                          DETAILS
                        </button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedWarranty && (
        <div className="portal-modal-overlay" onClick={() => setSelectedWarranty(null)}>
          <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="portal-modal-header">
              <h3>Warranty Details</h3>
              <button className="close-btn" onClick={() => setSelectedWarranty(null)}><Icon name="x" size={20} /></button>
            </div>
            <div className="portal-modal-content">
              <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label>Product Name</label>
                  <p style={{ fontWeight: 700 }}>{selectedWarranty.productName}</p>
                </div>
                <div>
                  <label>Status</label>
                  <div>{getStatusBadge(selectedWarranty.status)}</div>
                </div>
                <div>
                  <label>Invoice Number</label>
                  <p>#{selectedWarranty.invoiceNumber}</p>
                </div>
                <div>
                  <label>SKU / Model</label>
                  <p>{selectedWarranty.productSku || 'N/A'}</p>
                </div>
                <div>
                  <label>Start Date</label>
                  <p>{formatDateOnlyIST(selectedWarranty.startDate)}</p>
                </div>
                <div>
                  <label>Expiry Date</label>
                  <p style={{ fontWeight: 700, color: '#ef4444' }}>{formatDateOnlyIST(selectedWarranty.expiryDate)}</p>
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Description / Coverage</label>
                <p style={{ fontSize: '0.85rem' }}>{selectedWarranty.description || 'Standard manufacturing warranty covering hardware defects.'}</p>
              </div>

              {selectedWarranty.pendingRequests?.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="clock" size={16} /> Pending Renewal Request
                  </h4>
                  {selectedWarranty.pendingRequests.map(req => (
                    <div key={req._id} style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      Requested: {formatDateOnlyIST(req.createdAt)} for {req.data?.years} year(s).
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Renewal Request Modal */}
      {isRenewing && renewalWarranty && (
        <div className="portal-modal-overlay" onClick={() => setIsRenewing(false)}>
          <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="portal-modal-header">
              <h3>Request Renewal</h3>
              <button className="close-btn" onClick={() => setIsRenewing(false)}><Icon name="x" size={20} /></button>
            </div>
            <form onSubmit={handleRenewalSubmit} className="portal-modal-content">
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Request to extend warranty for <strong>{renewalWarranty.productName}</strong>.
              </p>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Renewal Period</label>
                <select 
                  value={renewalData.years} 
                  onChange={e => setRenewalData({...renewalData, years: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <option value={1}>1 Year (₹999)</option>
                  <option value={2}>2 Years (₹1899)</option>
                  <option value={3}>3 Years (₹2699)</option>
                </select>
              </div>

              {renewalData.paymentMethod === 'UPI' && (
                <button
                  type="button"
                  onClick={() => setShowQR(true)}
                  style={{
                    width: '100%',
                    marginBottom: '1rem',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    border: '1px dashed #0ea5e9',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="camera" size={18} />
                  Scan QR to Pay
                </button>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Payment Method</label>
                <select 
                  value={renewalData.paymentMethod} 
                  onChange={e => setRenewalData({...renewalData, paymentMethod: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash at Store</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Transaction ID / Notes</label>
                <input 
                  type="text" 
                  placeholder="Enter transaction ID or payment proof ref"
                  value={renewalData.details}
                  onChange={e => setRenewalData({...renewalData, details: e.target.value})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  required={renewalData.paymentMethod !== 'Cash'}
                />
              </div>

              <button 
                type="submit" 
                className="logout-btn" 
                style={{ width: '100%', background: '#6366f1', color: 'white', border: 'none', padding: '0.75rem', fontWeight: 700 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Renewal Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showQR && renewalWarranty && (
        <PaymentQRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          amount={999 * renewalData.years}
          description={`Warranty Renewal - ${renewalWarranty.productName} (${renewalData.years}y)`}
        />
      )}

      {/* Claim Request Modal */}
      {isClaiming && claimWarranty && (
        <div className="portal-modal-overlay" onClick={() => setIsClaiming(false)}>
          <div className="portal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="portal-modal-header">
              <h3>Submit Warranty Claim</h3>
              <button className="close-btn" onClick={() => setIsClaiming(false)}><Icon name="x" size={20} /></button>
            </div>
            <form onSubmit={handleClaimSubmit} className="portal-modal-content">
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
                Submit a service request for <strong>{claimWarranty.productName}</strong>. 
                Our technical team will review your claim and contact you.
              </p>
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Issue Description</label>
                <textarea 
                  placeholder="Describe the problem you're facing with the product..."
                  value={claimData.description}
                  onChange={e => setClaimData({...claimData, description: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    minHeight: '120px',
                    fontFamily: 'inherit'
                  }}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="logout-btn" 
                style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '0.75rem', fontWeight: 700 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Claim Request'}
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
        .details-grid label, .form-group label { display: block; font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
        .details-grid p { margin: 0; color: #1e293b; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default CustomerWarranties;
