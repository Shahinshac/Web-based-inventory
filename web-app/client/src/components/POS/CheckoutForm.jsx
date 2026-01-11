import React, { useState } from 'react';
import PaymentModeSelector from './PaymentModeSelector';
import SplitPaymentForm from './SplitPaymentForm';
import Button from '../Common/Button';
import Icon from '../../Icon';
import { formatCurrency, formatCurrency0, GST_PERCENT, PAYMENT_MODES, validateSplitPayment } from '../../constants';

export default function CheckoutForm({ 
  cart,
  cartTotal,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCheckout,
  isOnline,
  companyInfo
}) {
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.CASH);
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('')

  const subtotal = cartTotal;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = (afterDiscount * GST_PERCENT) / 100;
  const finalTotal = afterDiscount + gstAmount;

  const handleCheckout = async () => {
    setCheckoutError('')

    if (cart.length === 0) {
      setCheckoutError('Cart is empty. Add products to proceed.')
      return;
    }

    // Validate item quantities against stock (inline errors)
    for (const item of cart) {
      const q = Number(item.quantity) || 0
      if (q <= 0) {
        setCheckoutError(`Item "${item.name}" has invalid quantity.`)
        return
      }
      if (item.maxStock !== undefined && q > item.maxStock) {
        setCheckoutError(`Item "${item.name}" exceeds available stock (${item.maxStock}).`)
        return
      }
    }

    // Validate split payment if enabled
    if (splitPayment) {
      const validation = validateSplitPayment(
        parseFloat(cashAmount) || 0,
        parseFloat(upiAmount) || 0,
        parseFloat(cardAmount) || 0,
        finalTotal
      );

      if (!validation.valid) {
        setCheckoutError(validation.error)
        return;
      }
    }

    setLoading(true);

    const billData = {
      items: cart,
      customer: selectedCustomer,
      discount,
      paymentMode: splitPayment ? PAYMENT_MODES.SPLIT : paymentMode,
      splitPaymentDetails: splitPayment ? {
        cash: parseFloat(cashAmount) || 0,
        upi: parseFloat(upiAmount) || 0,
        card: parseFloat(cardAmount) || 0
      } : null,
      subtotal,
      discountAmount,
      gstAmount,
      total: finalTotal,
      timestamp: new Date().toISOString()
    };

    try {
      const result = await onCheckout(billData);
      
      if (result.success) {
        // Reset form
        setDiscount(0);
        setPaymentMode(PAYMENT_MODES.CASH);
        setSplitPayment(false);
        setCashAmount('');
        setUpiAmount('');
        setCardAmount('');
        onSelectCustomer(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-form">
      <div className="checkout-section">
        <h4 className="checkout-section-title">
          <Icon name="user" size={18} />
          Customer (Optional)
        </h4>
        {checkoutError && <div className="form-error" style={{ marginBottom: '10px' }}>{checkoutError}</div>}
        <select
          className="customer-select"
          value={selectedCustomer?.id || ''}
          onChange={(e) => {
            const customer = customers.find(c => c.id === e.target.value);
            onSelectCustomer(customer || null);
          }}
        >
          <option value="">Walk-in Customer</option>
          {customers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.phone}
            </option>
          ))}
        </select>
      </div>

      <div className="checkout-section">
        <h4 className="checkout-section-title">
          <Icon name="percent" size={18} />
          Discount (%)
        </h4>
        <input
          type="number"
          className="discount-input"
          value={discount}
          onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
          min="0"
          max="100"
          step="0.1"
          placeholder="Enter discount %"
        />
      </div>

      <PaymentModeSelector 
        paymentMode={paymentMode}
        onPaymentModeChange={setPaymentMode}
        splitPayment={splitPayment}
        onSplitPaymentChange={setSplitPayment}
      />

      {splitPayment && (
        <SplitPaymentForm 
          cashAmount={cashAmount}
          upiAmount={upiAmount}
          cardAmount={cardAmount}
          onCashChange={setCashAmount}
          onUpiChange={setUpiAmount}
          onCardChange={setCardAmount}
          total={finalTotal}
        />
      )}

      <div className="checkout-summary">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="summary-row discount">
            <span>Discount ({discount}%):</span>
            <span>- {formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>GST ({GST_PERCENT}%):</span>
          <span>{formatCurrency(gstAmount)}</span>
        </div>
        <div className="summary-row total">
          <strong>Total:</strong>
          <strong>{formatCurrency0(finalTotal)}</strong>
        </div>
      </div>

      <Button
        variant="primary"
        size="large"
        onClick={handleCheckout}
        loading={loading}
        disabled={cart.length === 0 || loading}
        icon="check-circle"
        fullWidth
      >
        Complete Sale
      </Button>

      {!isOnline && (
        <div className="checkout-warning">
          <Icon name="wifi-off" size={16} />
          <span>Offline mode - sale will sync when online</span>
        </div>
      )}
    </div>
  );
}
