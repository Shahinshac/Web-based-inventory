import React, { useState } from 'react';
import ProductSearch from './ProductSearch';
import Cart from './Cart';
import CheckoutForm from './CheckoutForm';
import BarcodeScanner from './BarcodeScanner';
import Icon from '../../Icon';
import Button from '../Common/Button';

export default function POSSystem({ 
  products,
  customers,
  cart,
  onAddToCart,
  onUpdateCartItem,
  onRemoveFromCart,
  onClearCart,
  selectedCustomer,
  onSelectCustomer,
  onCheckout,
  isOnline,
  companyInfo,
  cartErrors = {}
}) {
  const [showScanner, setShowScanner] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [addError, setAddError] = useState('')

  const handleProductSelect = (product, quantity = 1) => {
    const res = onAddToCart(product, quantity);
    if (res && !res.success) {
      setAddError(res.error || 'Failed to add product')
      setTimeout(() => setAddError(''), 4000)
    }
  };

  const handleBarcodeScanned = (barcode) => {
    const product = products.find(p => p.barcode === barcode || p.serialNo === barcode);
    if (product) {
      if (product.quantity > 0) {
        const res = onAddToCart(product, 1);
        if (res && !res.success) {
          setAddError(res.error || 'Failed to add product')
          setTimeout(() => setAddError(''), 4000)
        }
      } else {
        setAddError('⚠️ Product is out of stock!')
        setTimeout(() => setAddError(''), 4000)
      }
    } else {
      setAddError('❌ Product not found with barcode: ' + barcode)
      setTimeout(() => setAddError(''), 4000)
    }
    setShowScanner(false);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="pos-system">
      <div className="pos-header">
        <h2 className="pos-title">🛒 Point of Sale</h2>
        <div className="pos-actions">
          <Button
            variant="secondary"
            onClick={() => setShowScanner(true)}
            icon="camera"
          >
            Scan Barcode
          </Button>
          <button 
            className="cart-toggle-btn mobile-only"
            onClick={() => setCartOpen(!cartOpen)}
          >
            <Icon name="shopping-cart" size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="pos-content">
        <div className="pos-left">
          <ProductSearch 
            products={products}
            onProductSelect={handleProductSelect}
          />
          {addError && <div className="form-error" style={{ marginTop: 8 }}>{addError}</div>}
        </div>

        <div className={`pos-right ${cartOpen ? 'mobile-open' : ''}`}>
          <Cart 
            cart={cart}
            onUpdateQuantity={onUpdateCartItem}
            onRemove={onRemoveFromCart}
            onClear={onClearCart}
            errors={cartErrors}
          />

          <CheckoutForm 
            cart={cart}
            cartTotal={cartTotal}
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={onSelectCustomer}
            onCheckout={onCheckout}
            isOnline={isOnline}
            companyInfo={companyInfo}
          />
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {cartOpen && (
        <div 
          className="cart-overlay mobile-only"
          onClick={() => setCartOpen(false)}
        />
      )}
    </div>
  );
}
