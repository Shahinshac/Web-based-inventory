import React from 'react';
import Modal from '../Common/Modal';
import InvoiceActions from './InvoiceActions';
import Icon from '../../Icon';
import { formatCurrency, formatCurrency0, GST_PERCENT, PAYMENT_MODE_LABELS } from '../../constants';

export default function InvoiceDetails({ invoice, onClose, onExport, onShare }) {
  const date = new Date(invoice.createdAt || invoice.billDate || invoice.date);
  const formattedDate = date.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  const billNumber = invoice.billNumber || invoice.id;
  const customerName = invoice.customer?.name || invoice.customerName || 'Walk-in Customer';
  const customerPhone = invoice.customer?.phone || invoice.customerPhone || '';
  const customerAddress = invoice.customer?.address || invoice.customerAddress || '';
  const customerPlace = invoice.customer?.place || invoice.customerPlace || '';
  const customerGstin = invoice.customer?.gstin || invoice.customerGstin || '';
  const hasCustomer = customerName && customerName !== 'Walk-in Customer';

  return (
    <Modal 
      isOpen={true}
      onClose={onClose}
      title={`Invoice #${billNumber}`}
      size="xl"
    >
      <div className="invoice-details">
        <div className="invoice-header">
          <div className="invoice-info">
            <h3>Invoice #{billNumber}</h3>
            <p className="invoice-datetime">
              <Icon name="calendar" size={16} />
              {formattedDate} at {formattedTime}
            </p>
          </div>
          <InvoiceActions 
            invoice={invoice}
            onExport={onExport}
            onShare={onShare}
          />
        </div>

        {hasCustomer && (
          <div className="invoice-section">
            <h4>Customer Details</h4>
            <div className="customer-details">
              <div><strong>Name:</strong> {customerName}</div>
              {customerPhone && <div><strong>Phone:</strong> {customerPhone}</div>}
              {customerAddress && <div><strong>Address:</strong> {customerAddress}</div>}
              {customerPlace && <div><strong>Place:</strong> {customerPlace}</div>}
              {customerGstin && <div><strong>GSTIN:</strong> {customerGstin}</div>}
            </div>
          </div>
        )}

        <div className="invoice-section">
          <h4>Items</h4>
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Base Price</th>
                <th>GST%</th>
                <th>GST Amt</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => {
                const unitPrice = item.price || item.unitPrice || 0;
                const qty = item.quantity || 0;
                const gstPct = item.gstPercent !== undefined ? item.gstPercent : GST_PERCENT;
                const lineBase = unitPrice * qty;
                // Apply discount factor when falling back (legacy bills without lineGstAmount)
                const discountFactor = invoice.discountPercent > 0
                  ? 1 - (invoice.discountPercent / 100)
                  : 1;
                const lineGst = item.lineGstAmount !== undefined
                  ? item.lineGstAmount
                  : lineBase * discountFactor * (gstPct / 100);
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.name || item.productName}</td>
                    <td>{item.hsnCode || '9999'}</td>
                    <td>{qty}</td>
                    <td>{formatCurrency(unitPrice)}</td>
                    <td>{gstPct}%</td>
                    <td>{formatCurrency(lineGst)}</td>
                    <td>{formatCurrency(lineBase + lineGst)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="invoice-section">
          <h4>Payment Details</h4>
          <div className="payment-details">
            <div className="detail-row">
              <span>Payment Mode:</span>
              <strong>{PAYMENT_MODE_LABELS[invoice.paymentMode] || invoice.paymentMode}</strong>
            </div>
            {invoice.splitPaymentDetails && (
              <div className="split-payment-details">
                {Number(invoice.splitPaymentDetails.cash || 0) > 0 && (
                  <div><strong>Cash:</strong> {formatCurrency(invoice.splitPaymentDetails.cash)}</div>
                )}
                {Number(invoice.splitPaymentDetails.upi || 0) > 0 && (
                  <div><strong>UPI:</strong> {formatCurrency(invoice.splitPaymentDetails.upi)}</div>
                )}
                {Number(invoice.splitPaymentDetails.card || 0) > 0 && (
                  <div><strong>Card:</strong> {formatCurrency(invoice.splitPaymentDetails.card)}</div>
                )}
              </div>
            )}
            {invoice.paymentMode === 'emi' && invoice.emiDetails && (
              <div className="emi-payment-details" style={{ marginTop: '8px', padding: '12px', background: '#fdf2f8', borderRadius: '8px', border: '1px solid #fbcfe8' }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#be185d', fontSize: '13px' }}>EMI Information</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  <div><span style={{ color: '#6b7280' }}>Tenure:</span> <strong>{invoice.emiDetails.months} Months</strong></div>
                  <div><span style={{ color: '#6b7280' }}>Monthly EMI:</span> <strong>{formatCurrency(invoice.emiDetails.emiAmount)}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#6b7280' }}>Down Payment:</span> <strong>{formatCurrency(invoice.emiDetails.downPayment)}</strong></div>
                </div>
              </div>
            )}
            {invoice.createdByUsername && (
              <div className="detail-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <span>Salesperson:</span>
                <strong>{invoice.createdByUsername}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="invoice-section">
          <h4>Amount Summary</h4>
          <div className="amount-summary">
            <div className="summary-row">
              <span>Subtotal (before discount):</span>
              <span>{formatCurrency(invoice.subtotal || invoice.total)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="summary-row discount">
                <span>Discount{invoice.discountPercent > 0 ? ` (${invoice.discountPercent}%)` : ''}:</span>
                <span>- {formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Taxable Amount:</span>
              <span>{formatCurrency(invoice.afterDiscount || (invoice.subtotal - (invoice.discountAmount || 0)))}</span>
            </div>
            {/* Show CGST + SGST for same-state, or IGST for different-state */}
            {invoice.isSameState !== false ? (
              <>
                <div className="summary-row">
                  <span>CGST:</span>
                  <span>{formatCurrency(invoice.cgst || (invoice.gstAmount || 0) / 2)}</span>
                </div>
                <div className="summary-row">
                  <span>SGST:</span>
                  <span>{formatCurrency(invoice.sgst || (invoice.gstAmount || 0) / 2)}</span>
                </div>
              </>
            ) : (
              <div className="summary-row">
                <span>IGST:</span>
                <span>{formatCurrency(invoice.igst || invoice.gstAmount || 0)}</span>
              </div>
            )}
            <div className="summary-row" style={{ fontWeight: '500' }}>
              <span>Total GST:</span>
              <span>{formatCurrency(invoice.gstAmount || 0)}</span>
            </div>
            <div className="summary-row total">
              <strong>Grand Total:</strong>
              <strong>{formatCurrency0(invoice.grandTotal || invoice.total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
