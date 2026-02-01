import React from 'react';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';

export default function SplitPaymentForm({ 
  cashAmount,
  upiAmount,
  cardAmount,
  onCashChange,
  onUpiChange,
  onCardChange,
  total
}) {
  const totalPaid = (parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0) + (parseFloat(cardAmount) || 0);
  const remaining = total - totalPaid;
  const isValid = Math.abs(remaining) < 0.01; // Account for floating point precision

  // Calculate percentages for progress bars
  const cashPercent = total > 0 ? ((parseFloat(cashAmount) || 0) / total) * 100 : 0;
  const upiPercent = total > 0 ? ((parseFloat(upiAmount) || 0) / total) * 100 : 0;
  const cardPercent = total > 0 ? ((parseFloat(cardAmount) || 0) / total) * 100 : 0;

  return (
    <div className="split-payment-form-modern">
      {/* Payment Input Cards */}
      <div className="split-payment-inputs">
        <div className="split-input-card cash-card">
          <div className="split-input-header">
            <div className="split-input-icon" style={{ background: 'linear-gradient(135deg, #10b98120, #10b98110)' }}>
              <Icon name="dollar-sign" size={20} style={{ color: '#10b981' }} />
            </div>
            <div className="split-input-label">
              <span className="split-label-main">Cash</span>
              <span className="split-label-sub">{cashPercent.toFixed(0)}% of total</span>
            </div>
          </div>
          <div className="split-input-wrapper">
            <span className="split-currency-symbol">₹</span>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => onCashChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="split-amount-input"
            />
          </div>
          <div className="split-progress-bar">
            <div className="split-progress-fill" style={{ width: `${Math.min(cashPercent, 100)}%`, background: '#10b981' }}></div>
          </div>
        </div>

        <div className="split-input-card upi-card">
          <div className="split-input-header">
            <div className="split-input-icon" style={{ background: 'linear-gradient(135deg, #6366f120, #6366f110)' }}>
              <Icon name="smartphone" size={20} style={{ color: '#6366f1' }} />
            </div>
            <div className="split-input-label">
              <span className="split-label-main">UPI</span>
              <span className="split-label-sub">{upiPercent.toFixed(0)}% of total</span>
            </div>
          </div>
          <div className="split-input-wrapper">
            <span className="split-currency-symbol">₹</span>
            <input
              type="number"
              value={upiAmount}
              onChange={(e) => onUpiChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="split-amount-input"
            />
          </div>
          <div className="split-progress-bar">
            <div className="split-progress-fill" style={{ width: `${Math.min(upiPercent, 100)}%`, background: '#6366f1' }}></div>
          </div>
        </div>

        <div className="split-input-card card-card">
          <div className="split-input-header">
            <div className="split-input-icon" style={{ background: 'linear-gradient(135deg, #f59e0b20, #f59e0b10)' }}>
              <Icon name="credit-card" size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div className="split-input-label">
              <span className="split-label-main">Card</span>
              <span className="split-label-sub">{cardPercent.toFixed(0)}% of total</span>
            </div>
          </div>
          <div className="split-input-wrapper">
            <span className="split-currency-symbol">₹</span>
            <input
              type="number"
              value={cardAmount}
              onChange={(e) => onCardChange(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="split-amount-input"
            />
          </div>
          <div className="split-progress-bar">
            <div className="split-progress-fill" style={{ width: `${Math.min(cardPercent, 100)}%`, background: '#f59e0b' }}></div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className={`split-payment-summary-modern ${isValid ? 'valid' : remaining < 0 ? 'overpaid' : 'underpaid'}`}>
        <div className="split-summary-header">
          <Icon name="info" size={16} />
          <span>Payment Summary</span>
        </div>
        <div className="split-summary-rows">
          <div className="split-summary-row">
            <span>Total Bill:</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <div className="split-summary-row">
            <span>Total Paid:</span>
            <strong>{formatCurrency(totalPaid)}</strong>
          </div>
          <div className="split-summary-divider"></div>
          <div className="split-summary-row balance">
            <span>{remaining > 0 ? 'Remaining:' : remaining < 0 ? 'Excess:' : 'Balanced:'}</span>
            <strong className={remaining > 0 ? 'text-danger' : remaining < 0 ? 'text-warning' : 'text-success'}>
              {formatCurrency(Math.abs(remaining))}
            </strong>
          </div>
        </div>

        {!isValid && (
          <div className="split-payment-alert">
            <Icon name="alert-circle" size={16} />
            <span>
              {remaining > 0 
                ? `Add ${formatCurrency(remaining)} more to complete` 
                : `Reduce by ${formatCurrency(Math.abs(remaining))} to balance`
              }
            </span>
          </div>
        )}

        {isValid && (
          <div className="split-payment-success">
            <Icon name="check-circle" size={16} />
            <span>Payment amounts are balanced!</span>
          </div>
        )}
      </div>
    </div>
  );
}
