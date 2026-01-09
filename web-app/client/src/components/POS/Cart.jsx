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
      <div className="cart empty">
        <div className="cart-header">
          <h3 className="cart-title">
            <Icon name="shopping-cart" size={20} />
            Shopping Cart
          </h3>
        </div>
        <div className="cart-empty-state">
          <Icon name="shopping-cart" size={64} color="#cbd5e1" />
          <p>Your cart is empty</p>
          <small>Add products to get started</small>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <div className="cart-header">
        <h3 className="cart-title">
          <Icon name="shopping-cart" size={20} />
          Shopping Cart
          <span className="cart-count">({cartCount} items)</span>
        </h3>
        <Button 
          variant="ghost" 
          size="small"
          onClick={onClear}
          icon="trash-2"
        >
          Clear
        </Button>
      </div>

      <div className="cart-items">
        {cart.map((item) => (
          <CartItem 
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-total">
          <span>Subtotal:</span>
          <strong>{formatCurrency(cartTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
