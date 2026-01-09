import React from 'react';
import CartItem from './CartItem';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency } from '../../constants';

export default function Cart({ 
  cart, 
  onUpdateQuantity, 
  onRemove, 
  onClear 
}) {
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="cart empty" style={{ minHeight: '400px' }}>
        <div className="cart-header" style={{ padding: '20px 24px' }}>
          <h3 className="cart-title" style={{ fontSize: '18px' }}>
            <Icon name="shopping-cart" size={24} />
            Shopping Cart
          </h3>
        </div>
        <div className="cart-empty-state" style={{ padding: '48px 24px' }}>
          <Icon name="shopping-cart" size={72} color="#cbd5e1" />
          <p style={{ fontSize: '16px', marginTop: '16px', marginBottom: '8px' }}>Your cart is empty</p>
          <small style={{ fontSize: '14px', color: '#64748b' }}>Add products to get started</small>
        </div>
      </div>
    );
  }

  return (
    <div className="cart" style={{ boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)' }}>
      <div className="cart-header" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <h3 className="cart-title" style={{ fontSize: '18px' }}>
          <Icon name="shopping-cart" size={24} />
          Cart
          <span className="cart-count" style={{ fontSize: '14px' }}>({cartCount})</span>
        </h3>
        <Button 
          variant="ghost" 
          size="small"
          onClick={onClear}
          icon="trash-2"
          style={{ color: 'white', opacity: 0.9, padding: '8px 16px', fontSize: '14px' }}
        >
          Clear
        </Button>
      </div>

      <div className="cart-items" style={{ padding: '20px', gap: '12px', display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
        {cart.map((item) => (
          <CartItem 
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className="cart-summary" style={{ padding: '20px 24px', borderTop: '2px solid #e2e8f0', background: '#f8f9fa' }}>
        <div className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: '600' }}>
          <span style={{ color: '#475569' }}>Total:</span>
          <strong style={{ fontSize: '22px', color: '#1e293b' }}>{formatCurrency(cartTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
