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
      } else {
        setError(result.error || 'Failed to generate payment link');
      }
    } catch (err) {
      setError(err.message || 'Error generating payment link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="payment-link-modal-overlay">
      <div className="payment-link-modal">
        {/* Header */}
        <div className="payment-link-modal-header">
          <div className="payment-link-modal-title">
            <Icon name="qr-code" size={20} />
            <span>UPI Payment</span>
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
                icon="qr-code"
                fullWidth
                className="payment-link-generate-btn"
              >
                Generate QR Code
              </Button>

              <p className="payment-link-info-text">
                <Icon name="info" size={14} />
                Scan with any UPI app to make payment
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
                  QR Code Generated!
                </span>
              </div>

              {/* QR Code */}
              {generatedLink.qrCode && (
                <div className="payment-link-qr-section">
                  <span className="payment-link-qr-label">Scan to Pay</span>
                  <div className="payment-link-qr-code">
                    <img
                      src={generatedLink.qrCode}
                      alt="UPI Payment QR Code"
                    />
                  </div>
                </div>
              )}

              {/* Amount Info */}
              <div className="payment-link-details-card">
                <div className="payment-link-detail-row">
                  <span className="payment-link-detail-label">Amount:</span>
                  <span className="payment-link-detail-value">
                    ₹{generatedLink.amount}
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
                variant="primary"
                onClick={() => {
                  setGeneratedLink(null);
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
