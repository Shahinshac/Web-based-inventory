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

  return (
    <div className="split-payment-form">
      <div className="split-payment-input">
        <label>
          <Icon name="dollar-sign" size={16} />
          Cash
        </label>
        <input
          type="number"
          value={cashAmount}
          onChange={(e) => onCashChange(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <div className="split-payment-input">
        <label>
          <Icon name="smartphone" size={16} />
          UPI
        </label>
        <input
          type="number"
          value={upiAmount}
          onChange={(e) => onUpiChange(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <div className="split-payment-input">
        <label>
          <Icon name="credit-card" size={16} />
          Card
        </label>
        <input
          type="number"
          value={cardAmount}
          onChange={(e) => onCardChange(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <div className={`split-payment-summary ${isValid ? 'valid' : remaining < 0 ? 'overpaid' : 'underpaid'}`}>
        <div className="split-summary-row">
          <span>Total Bill:</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className="split-summary-row">
          <span>Total Paid:</span>
          <strong>{formatCurrency(totalPaid)}</strong>
        </div>
        <div className="split-summary-row remaining">
          <span>{remaining > 0 ? 'Remaining:' : remaining < 0 ? 'Excess:' : 'Balanced:'}</span>
          <strong className={remaining > 0 ? 'text-danger' : remaining < 0 ? 'text-warning' : 'text-success'}>
            {formatCurrency(Math.abs(remaining))}
          </strong>
        </div>
      </div>

      {!isValid && (
        <div className="split-payment-warning">
          <Icon name="alert-circle" size={16} />
          <span>
            {remaining > 0 
              ? `Please add ${formatCurrency(remaining)} more` 
              : `Excess payment of ${formatCurrency(Math.abs(remaining))}`
            }
          </span>
        </div>
      )}
    </div>
  );
}
