import React from 'react';
import Icon from '../../Icon';
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '../../constants';

export default function PaymentModeSelector({ 
  paymentMode, 
  onPaymentModeChange,
  splitPayment,
  onSplitPaymentChange
}) {
  const paymentModes = [
    { value: PAYMENT_MODES.CASH, label: PAYMENT_MODE_LABELS[PAYMENT_MODES.CASH], icon: 'dollar-sign' },
    { value: PAYMENT_MODES.UPI, label: PAYMENT_MODE_LABELS[PAYMENT_MODES.UPI], icon: 'smartphone' },
    { value: PAYMENT_MODES.CARD, label: PAYMENT_MODE_LABELS[PAYMENT_MODES.CARD], icon: 'credit-card' },
    { value: PAYMENT_MODES.CHEQUE, label: PAYMENT_MODE_LABELS[PAYMENT_MODES.CHEQUE], icon: 'file-text' },
  ];

  return (
    <div className="payment-mode-selector">
      <div className="payment-mode-header">
        <h4 className="payment-mode-title">
          <Icon name="credit-card" size={18} />
          Payment Method
        </h4>
        <label className="split-payment-toggle">
          <input
            type="checkbox"
            checked={splitPayment}
            onChange={(e) => onSplitPaymentChange(e.target.checked)}
          />
          <span>Split Payment</span>
        </label>
      </div>

      {!splitPayment && (
        <div className="payment-modes-grid">
          {paymentModes.map(mode => (
            <button
              key={mode.value}
              className={`payment-mode-btn ${paymentMode === mode.value ? 'active' : ''}`}
              onClick={() => onPaymentModeChange(mode.value)}
            >
              <Icon name={mode.icon} size={20} />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
