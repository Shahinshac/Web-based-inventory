import React, { useState } from 'react';
import InvoiceActions from './InvoiceActions';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import { formatCurrency, formatCurrency0, PAYMENT_MODE_LABELS } from '../../constants';

export default function InvoiceCard({ invoice, onView, onDelete, onExport, onShare }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const date = new Date(invoice.createdAt || invoice.billDate || invoice.date);
  const formattedDate = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

  return (
    <>
      <div className="invoice-card">
        <div className="invoice-card-header">
          <div className="invoice-number">
            <Icon name="file-text" size={20} />
            <span>Invoice #{invoice.id}</span>
          </div>
          <div className="invoice-date">
            {formattedDate}
            <small>{formattedTime}</small>
          </div>
        </div>

        <div className="invoice-card-body">
          {invoice.customer ? (
            <div className="invoice-customer">
              <Icon name="user" size={16} />
              <div>
                <strong>{invoice.customer.name}</strong>
                <span>{invoice.customer.phone}</span>
              </div>
            </div>
          ) : (
            <div className="invoice-customer walk-in">
              <Icon name="user" size={16} />
              <span>Walk-in Customer</span>
            </div>
          )}

          <div className="invoice-details">
            <div className="detail-row">
              <span>Items:</span>
              <span>{invoice.items?.length || 0} products</span>
            </div>
            <div className="detail-row">
              <span>Payment:</span>
              <span>{PAYMENT_MODE_LABELS[invoice.paymentMode] || invoice.paymentMode}</span>
            </div>
            {invoice.createdByUsername && (
              <div className="detail-row">
                <span>Salesperson:</span>
                <span>{invoice.createdByUsername}</span>
              </div>
            )}
          </div>

          <div className="invoice-total">
            <span>Total Amount:</span>
            <strong>{formatCurrency0(invoice.total)}</strong>
          </div>
        </div>

        <div className="invoice-card-actions">
          <Button
            variant="ghost"
            size="small"
            onClick={onView}
            icon="eye"
          >
            View
          </Button>

          <InvoiceActions 
            invoice={invoice}
            onExport={onExport}
            onShare={onShare}
          />

          {onDelete && (
            <Button
              variant="danger"
              size="small"
              onClick={() => setShowDeleteConfirm(true)}
              icon="trash-2"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(invoice.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice #${invoice.id}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
