import React from 'react';
import Modal from './Modal';
import Icon from '../../Icon';

export default function PaymentQRModal({ isOpen, onClose, amount, description }) {
  const upiId = '7594012761@superyes';
  const payeeName = '26:07 Electronics';
  
  // Format the UPI URI
  const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(description || 'Payment')}`;
  
  // Using a QR code generation service (goqr.me)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan to Pay" size="sm">
      <div className="payment-qr-content" style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Amount to Pay</p>
          <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>₹{parseFloat(amount).toLocaleString('en-IN')}</h2>
        </div>

        <div style={{ 
          background: 'white', 
          padding: '16px', 
          borderRadius: '16px', 
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
          display: 'inline-block',
          marginBottom: '20px',
          border: '1px solid #f1f5f9'
        }}>
          <img 
            src={qrUrl} 
            alt="Payment QR Code" 
            style={{ width: '200px', height: '200px', display: 'block' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>UPI ID</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: '#4f46e5' }}>{upiId}</p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: '12px', 
          borderRadius: '8px', 
          fontSize: '12px', 
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'center'
        }}>
          <Icon name="info" size={16} />
          <span>After payment, please notify the store for confirmation.</span>
        </div>
      </div>
    </Modal>
  );
}
