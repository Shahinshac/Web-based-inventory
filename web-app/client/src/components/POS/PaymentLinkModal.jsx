import React, { useState } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency0 } from '../../constants';
import '../../styles/payment-link-modal.css';

export default function PaymentLinkModal({
  isOpen,
  onClose,
  amount,
  selectedCustomer,
  onGenerateLink,
  loading
}) {
  const [showQR, setShowQR] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [error, setError] = useState('');

  const handleGenerateLink = async () => {
    setError('');

    if (!amount || amount <= 0) {
      setError('Invalid amount');
      return;
    }

    if (!selectedCustomer) {
      setError('Please select a customer first');
      return;
    }

    try {
      const result = await onGenerateLink({
        amount,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        description: `Invoice for ${selectedCustomer.name}`
      });

      if (result.success) {
        setGeneratedLink(result.paymentLink);
        setShowQR(true);
      } else {
        setError(result.error || 'Failed to generate payment link');
      }
    } catch (err) {
      setError(err.message || 'Error generating payment link');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="payment-link-modal-overlay">
      <div className="payment-link-modal">
        {/* Header */}
        <div className="payment-link-modal-header">
          <div className="payment-link-modal-title">
            <Icon name="link" size={20} />
            <span>Generate Payment Link</span>
          </div>
          <button
            className="payment-link-modal-close"
            onClick={onClose}
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="payment-link-modal-content">
          {error && (
            <div className="payment-link-error">
              <Icon name="alert-circle" size={16} />
              <span>{error}</span>
            </div>
          )}

          {!generatedLink ? (
            <>
              {/* Show Amount & Customer */}
              <div className="payment-link-info-card">
                <div className="payment-link-info-row">
                  <span className="payment-link-info-label">Amount</span>
                  <span className="payment-link-info-value amount">
                    <Icon name="indian-rupee" size={16} />
                    {formatCurrency0(amount)}
                  </span>
                </div>

                <div className="payment-link-info-row">
                  <span className="payment-link-info-label">Customer</span>
                  <span className="payment-link-info-value">
                    {selectedCustomer ? (
                      <>
                        <span className="payment-link-customer-name">
                          {selectedCustomer.name}
                        </span>
                        <span className="payment-link-customer-phone">
                          {selectedCustomer.phone}
                        </span>
                      </>
                    ) : (
                      <span className="payment-link-no-customer">
                        Not selected
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                variant="primary"
                onClick={handleGenerateLink}
                loading={loading}
                disabled={!selectedCustomer || !amount || loading}
                icon="plus"
                fullWidth
                className="payment-link-generate-btn"
              >
                Generate Payment Link
              </Button>

              <p className="payment-link-info-text">
                <Icon name="info" size={14} />
                A UPI payment link will be created and sent via message/email
              </p>
            </>
          ) : (
            <>
              {/* Generated Link Success */}
              <div className="payment-link-success">
                <div className="payment-link-success-icon">
                  <Icon name="check-circle" size={32} />
                </div>
                <span className="payment-link-success-text">
                  Payment link created successfully!
                </span>
              </div>

              {/* QR Code */}
              {generatedLink.qrCode && showQR && (
                <div className="payment-link-qr-section">
                  <span className="payment-link-qr-label">Scan to Pay</span>
                  <div className="payment-link-qr-code">
                    <img
                      src={generatedLink.qrCode}
                      alt="Payment QR Code"
                    />
                  </div>
                </div>
              )}

              {/* Share Options */}
              <div className="payment-link-share-section">
                <span className="payment-link-share-label">Share via:</span>
                <div className="payment-link-share-buttons">
                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${selectedCustomer.phone}?text=Hi!%20Please%20pay%20%E2%B9%B9${amount}%20using%20this%20UPI%20link:%20${encodeURIComponent(generatedLink.upiString)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="payment-link-share-btn whatsapp"
                    title="Send via WhatsApp"
                  >
                    <Icon name="message-circle" size={18} />
                    <span>WhatsApp</span>
                  </a>

                  {/* Copy UPI */}
                  <button
                    className="payment-link-share-btn copy"
                    onClick={() => copyToClipboard(generatedLink.upiString)}
                    title="Copy UPI String"
                  >
                    <Icon name="copy" size={18} />
                    <span>Copy UPI</span>
                  </button>

                  {/* Copy Link ID */}
                  <button
                    className="payment-link-share-btn link"
                    onClick={() => copyToClipboard(generatedLink.id)}
                    title="Copy Payment Link ID"
                  >
                    <Icon name="link" size={18} />
                    <span>Copy ID</span>
                  </button>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="payment-link-details-card">
                <div className="payment-link-detail-row">
                  <span className="payment-link-detail-label">Transaction ID:</span>
                  <span className="payment-link-detail-value">
                    {generatedLink.transactionId}
                  </span>
                </div>
                <div className="payment-link-detail-row">
                  <span className="payment-link-detail-label">Expires:</span>
                  <span className="payment-link-detail-value">
                    {new Date(generatedLink.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <Button
                variant="secondary"
                onClick={() => {
                  setGeneratedLink(null);
                  setShowQR(false);
                  onClose();
                }}
                fullWidth
              >
                Done
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
