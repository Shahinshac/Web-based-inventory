import React from 'react';
import Modal from '../Common/Modal';
import InvoiceActions from './InvoiceActions';
import Icon from '../../Icon';
import { formatCurrency, formatCurrency0, GST_PERCENT, PAYMENT_MODE_LABELS } from '../../constants';

export default function InvoiceDetails({ invoice, onClose, onExport, onShare }) {
  const date = new Date(invoice.createdAt || invoice.date);
  const formattedDate = date.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('en-IN');

  return (
    <Modal 
      isOpen={true}
      onClose={onClose}
      title={`Invoice #${invoice.id}`}
      size="large"
    >
      <div className="invoice-details">
        <div className="invoice-header">
          <div className="invoice-info">
            <h3>Invoice #{invoice.id}</h3>
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

        {invoice.customer && (
          <div className="invoice-section">
            <h4>Customer Details</h4>
            <div className="customer-details">
              <div><strong>Name:</strong> {invoice.customer.name}</div>
              <div><strong>Phone:</strong> {invoice.customer.phone}</div>
              {invoice.customer.address && <div><strong>Address:</strong> {invoice.customer.address}</div>}
              {invoice.customer.place && <div><strong>Place:</strong> {invoice.customer.place}</div>}
              {invoice.customer.gstin && <div><strong>GSTIN:</strong> {invoice.customer.gstin}</div>}
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
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
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
                <div><strong>Cash:</strong> {formatCurrency(invoice.splitPaymentDetails.cash)}</div>
                <div><strong>UPI:</strong> {formatCurrency(invoice.splitPaymentDetails.upi)}</div>
                <div><strong>Card:</strong> {formatCurrency(invoice.splitPaymentDetails.card)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="invoice-section">
          <h4>Amount Summary</h4>
          <div className="amount-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal || invoice.total)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>- {formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>GST ({GST_PERCENT}%):</span>
              <span>{formatCurrency(invoice.gstAmount || 0)}</span>
            </div>
            <div className="summary-row total">
              <strong>Total Amount:</strong>
              <strong>{formatCurrency0(invoice.total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
