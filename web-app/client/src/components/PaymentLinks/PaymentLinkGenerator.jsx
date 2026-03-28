/**
 * @file PaymentLinkGenerator.jsx
 * @description UPI payment link generator component
 */

import React, { useState } from 'react';
import Icon from '../../Icon.jsx';
import { createPaymentLink, downloadQRCode, copyToClipboard } from '../../services/paymentLinkService';
import './paymentLinks.css';

const PaymentLinkGenerator = () => {
  const [formData, setFormData] = useState({
    amount: '',
    customerName: '',
    customerPhone: '',
    description: ''
  });

  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.amount || formData.amount <= 0) {
      setError('Valid amount is required');
      return;
    }

    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    if (!formData.customerPhone || formData.customerPhone.length !== 10) {
      setError('Valid 10-digit phone number is required');
      return;
    }

    setLoading(true);
    try {
      const response = await createPaymentLink(
        formData.amount,
        formData.customerName,
        formData.customerPhone,
        formData.description
      );

      if (response.success && response.paymentLink) {
        setGeneratedLink(response.paymentLink);
        setFormData({ amount: '', customerName: '', customerPhone: '', description: '' });
      } else {
        setError(response.error || 'Failed to generate payment link');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUPI = async () => {
    try {
      await copyToClipboard(generatedLink.upiString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleDownloadQR = () => {
    try {
      downloadQRCode(generatedLink.qrCode, generatedLink.transactionId);
    } catch (err) {
      setError('Failed to download QR code');
    }
  };

  return (
    <div className="payment-generator">
      <div className="generator-header">
        <div>
          <h2>
            <Icon name="qr-code" size={24} />
            Payment Link Generator
          </h2>
          <p>Create UPI payment links for customers</p>
        </div>
      </div>

      <div className="generator-container">
        {!generatedLink ? (
          // Form Section
          <div className="generator-form-section">
            <form onSubmit={handleGenerateLink} className="generator-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="amount">
                    <Icon name="currency" size={14} />
                    Amount (₹)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="customerPhone">
                    <Icon name="call" size={14} />
                    Phone (10 digits)
                  </label>
                  <input
                    id="customerPhone"
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, customerPhone: val }));
                    }}
                    placeholder="9876543210"
                    maxLength="10"
                    required
                  />
                  {formData.customerPhone && formData.customerPhone.length !== 10 && (
                    <p className="field-hint error">Must be 10 digits</p>
                  )}
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="customerName">
                  <Icon name="user" size={14} />
                  Customer Name
                </label>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">
                  <Icon name="file-text" size={14} />
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Invoice details or order reference..."
                  rows="3"
                />
              </div>

              {error && (
                <div className="error-msg">
                  <Icon name="alert-circle" size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary btn-lg"
                disabled={loading || !formData.amount || !formData.customerName || formData.customerPhone.length !== 10}
              >
                {loading ? (
                  <>
                    <Icon name="spinner" size={16} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Icon name="qr-code" size={16} />
                    Generate Payment Link
                  </>
                )}
              </button>
            </form>

            <div className="generator-info">
              <h3>
                <Icon name="info" size={16} />
                How it works
              </h3>
              <ul>
                <li>Enter amount and customer details</li>
                <li>Generate a unique UPI payment link</li>
                <li>Share QR code or UPI string</li>
                <li>Customer pays via any UPI app (Google Pay, PhonePe, etc.)</li>
                <li>Link expires in 30 days</li>
              </ul>
            </div>
          </div>
        ) : (
          // Generated Link Display
          <div className="generated-link-section">
            <div className="link-card">
              <div className="link-header">
                <h3>Payment Link Generated</h3>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setGeneratedLink(null)}
                >
                  <Icon name="arrow-left" size={14} />
                  Back
                </button>
              </div>

              <div className="link-details">
                <div className="detail-row">
                  <span className="detail-label">Transaction ID:</span>
                  <span className="detail-value">{generatedLink.transactionId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value amount">₹{generatedLink.amount.toFixed(2)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value status-badge pending">Pending</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Expires:</span>
                  <span className="detail-value">
                    {new Date(generatedLink.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              <div className="qr-section">
                <h4>Scan to Pay</h4>
                {generatedLink.qrCode && (
                  <img src={generatedLink.qrCode} alt="Payment QR Code" className="qr-image" />
                )}
                <button className="btn-secondary" onClick={handleDownloadQR}>
                  <Icon name="download" size={14} />
                  Download QR Code
                </button>
              </div>

              {/* UPI String */}
              <div className="upi-section">
                <h4>UPI String (for manual entry)</h4>
                <div className="upi-input-group">
                  <input
                    type="text"
                    value={generatedLink.upiString}
                    readOnly
                    className="upi-string"
                  />
                  <button
                    className={`btn-secondary ${copied ? 'copied' : ''}`}
                    onClick={handleCopyUPI}
                    title="Copy UPI string"
                  >
                    <Icon name={copied ? 'check' : 'copy'} size={14} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div className="share-section">
                <h4>Share with customer</h4>
                <div className="share-buttons">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const text = `Pay ₹${generatedLink.amount} using this UPI link: ${generatedLink.upiString}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                    }}
                  >
                    <Icon name="share" size={14} />
                    WhatsApp
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      const subject = `Payment Required - ₹${generatedLink.amount}`;
                      const body = `Please pay ₹${generatedLink.amount} using this UPI link:\n\n${generatedLink.upiString}`;
                      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }}
                  >
                    <Icon name="mail" size={14} />
                    Email
                  </button>
                  <button className="btn-secondary" onClick={handleCopyUPI}>
                    <Icon name="copy" size={14} />
                    Copy Link
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-msg">
                  <Icon name="alert-circle" size={14} />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentLinkGenerator;
