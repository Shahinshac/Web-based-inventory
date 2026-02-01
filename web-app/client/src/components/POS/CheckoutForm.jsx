import React, { useState, useMemo } from 'react';
import SplitPaymentForm from './SplitPaymentForm';
import Button from '../Common/Button';
import Icon from '../../Icon';
import CustomerForm from '../Customers/CustomerForm';
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
  const [showDiscount, setShowDiscount] = useState(false);
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.CASH);
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  const subtotal = cartTotal;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = (afterDiscount * GST_PERCENT) / 100;
  const finalTotal = afterDiscount + gstAmount;

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const search = customerSearch.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(search) || 
      c.phone?.includes(search)
    );
  }, [customers, customerSearch]);

  // Payment modes configuration with enhanced visuals
  const paymentModes = [
    { value: PAYMENT_MODES.CASH, label: 'Cash', icon: 'dollar-sign', color: '#10b981', desc: 'Cash Payment' },
    { value: PAYMENT_MODES.UPI, label: 'UPI', icon: 'smartphone', color: '#6366f1', desc: 'GPay, PhonePe, Paytm' },
    { value: PAYMENT_MODES.CARD, label: 'Card', icon: 'credit-card', color: '#f59e0b', desc: 'Credit/Debit Card' },
    { value: PAYMENT_MODES.CHEQUE, label: 'Cheque', icon: 'file-text', color: '#8b5cf6', desc: 'Bank Cheque' },
  ];

  // Get customer initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Handle inline customer creation
  const handleCustomerCreated = (newCustomer) => {
    setShowCustomerForm(false);
    onSelectCustomer(newCustomer);
    setCustomerSearch('');
  };

  const handleCheckout = async () => {
    setCheckoutError('');

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
        setShowDiscount(false);
        setPaymentMode(PAYMENT_MODES.CASH);
        setSplitPayment(false);
        setCashAmount('');
        setUpiAmount('');
        setCardAmount('');
        setCustomerSearch('');
        onSelectCustomer(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-form-modern">
      {/* Error Display */}
      {checkoutError && (
        <div className="checkout-error-banner">
          <Icon name="alert-circle" size={18} />
          <span>{checkoutError}</span>
          <button onClick={() => setCheckoutError('')}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Customer Selection - Modern Card Style */}
      <div className="checkout-card customer-card">
        <div className="checkout-card-header">
          <div className="checkout-card-title">
            <Icon name="user" size={18} />
            <span>Customer</span>
          </div>
          <span className="checkout-card-badge optional">Optional</span>
        </div>
        
        <div className="customer-selector-modern">
          {selectedCustomer ? (
            <div className="selected-customer-card">
              <div className="customer-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {getInitials(selectedCustomer.name)}
              </div>
              <div className="customer-details">
                <span className="customer-name">{selectedCustomer.name}</span>
                <span className="customer-phone">
                  <Icon name="phone" size={12} />
                  {selectedCustomer.phone}
                </span>
              </div>
              <button 
                className="customer-clear-btn"
                onClick={() => {
                  onSelectCustomer(null);
                  setCustomerSearch('');
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="customer-search-input">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customerSearch && (
                  <button onClick={() => setCustomerSearch('')}>
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              
              {customerSearch && filteredCustomers.length > 0 ? (
                <div className="customer-dropdown">
                  {filteredCustomers.slice(0, 5).map(customer => (
                    <button
                      key={customer.id}
                      className="customer-option"
                      onClick={() => {
                        onSelectCustomer(customer);
                        setCustomerSearch('');
                      }}
                    >
                      <div className="customer-avatar small">
                        {getInitials(customer.name)}
                      </div>
                      <div className="customer-option-info">
                        <span>{customer.name}</span>
                        <span>{customer.phone}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : !customerSearch ? (
                <>
                  <div className="walk-in-badge">
                    <Icon name="user" size={16} />
                    <span>Walk-in Customer</span>
                  </div>
                  <button 
                    className="add-customer-btn"
                    onClick={() => setShowCustomerForm(true)}
                    type="button"
                  >
                    <Icon name="user-plus" size={16} />
                    <span>Add New Customer</span>
                  </button>
                </>
              ) : (
                <div className="no-customers-found">
                  <span>No customers found</span>
                  <button 
                    className="add-customer-link"
                    onClick={() => setShowCustomerForm(true)}
                    type="button"
                  >
                    <Icon name="plus" size={14} />
                    Create "{customerSearch}"
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Discount Section - Collapsible */}
      <div className="checkout-card discount-card">
        <button 
          className="discount-toggle"
          onClick={() => setShowDiscount(!showDiscount)}
        >
          <div className="checkout-card-title">
            <Icon name="percent" size={18} />
            <span>Discount</span>
          </div>
          <div className="discount-toggle-right">
            {discount > 0 && (
              <span className="discount-badge">-{discount}%</span>
            )}
            <Icon name={showDiscount ? 'chevron-up' : 'chevron-down'} size={18} />
          </div>
        </button>
        
        {showDiscount && (
          <div className="discount-input-section">
            <div className="discount-quick-btns">
              {[5, 10, 15, 20].map(d => (
                <button
                  key={d}
                  className={`discount-quick-btn ${discount === d ? 'active' : ''}`}
                  onClick={() => setDiscount(d)}
                >
                  {d}%
                </button>
              ))}
            </div>
            <div className="discount-custom-input">
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                min="0"
                max="100"
                step="0.5"
                placeholder="Custom %"
              />
              <span className="discount-input-suffix">%</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method - Modern Cards */}
      <div className="checkout-card payment-card">
        <div className="checkout-card-header">
          <div className="checkout-card-title">
            <Icon name="credit-card" size={18} />
            <span>Payment Method</span>
          </div>
          <label className="split-toggle-modern">
            <input
              type="checkbox"
              checked={splitPayment}
              onChange={(e) => setSplitPayment(e.target.checked)}
            />
            <span className="toggle-switch"></span>
            <span className="toggle-label">Split</span>
          </label>
        </div>

        {!splitPayment ? (
          <div className="payment-methods-grid">
            {paymentModes.map(mode => (
              <button
                key={mode.value}
                className={`payment-method-card ${paymentMode === mode.value ? 'active' : ''}`}
                onClick={() => setPaymentMode(mode.value)}
                style={{ '--accent-color': mode.color }}
              >
                <div className="payment-method-icon" style={{ background: `linear-gradient(135deg, ${mode.color}20, ${mode.color}10)` }}>
                  <Icon name={mode.icon} size={24} style={{ color: mode.color }} />
                </div>
                <div className="payment-method-content">
                  <span className="payment-method-label">{mode.label}</span>
                  <span className="payment-method-desc">{mode.desc}</span>
                </div>
                {paymentMode === mode.value && (
                  <div className="payment-method-check">
                    <Icon name="check-circle" size={18} style={{ color: mode.color }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
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
      </div>

      {/* Order Summary */}
      <div className="checkout-card summary-card">
        <div className="checkout-card-header">
          <div className="checkout-card-title">
            <Icon name="file-text" size={18} />
            <span>Order Summary</span>
          </div>
        </div>

        <div className="checkout-summary-modern">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row discount-row">
              <span>
                <Icon name="tag" size={14} />
                Discount ({discount}%)
              </span>
              <span className="discount-amount">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span>GST ({GST_PERCENT}%)</span>
            <span>{formatCurrency(gstAmount)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-row total-row">
            <strong>Total</strong>
            <strong className="total-amount">{formatCurrency0(finalTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Complete Sale Button */}
      <Button
        variant="primary"
        size="large"
        onClick={handleCheckout}
        loading={loading}
        disabled={cart.length === 0 || loading}
        icon="check-circle"
        fullWidth
        className="complete-sale-btn"
      >
        {loading ? 'Processing...' : `Complete Sale • ${formatCurrency0(finalTotal)}`}
      </Button>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="checkout-offline-warning">
          <Icon name="wifi-off" size={16} />
          <span>Offline mode - sale will sync when online</span>
        </div>
      )}

      {/* Inline Customer Creation Modal */}
      {showCustomerForm && (
        <CustomerForm
          onSubmit={handleCustomerCreated}
          onClose={() => setShowCustomerForm(false)}
          quickAdd={true}
        />
      )}
    </div>
  );
}
