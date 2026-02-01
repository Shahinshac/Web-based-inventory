import React from 'react';
import CartItem from './CartItem';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency } from '../../constants';
import { calculateSubtotal } from '../../utils/calculations';

export default function Cart({ 
  cart, 
  onUpdateQuantity, 
  onRemove, 
  onClear,
  errors = {}
}) {
  const cartTotal = calculateSubtotal(cart);
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
          <div className="bounce">
            <Icon name="shopping-cart" size={56} />
          </div>
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
          Cart
          <span className="cart-count">{cartCount}</span>
        </h3>
        <button className="cart-clear-btn" onClick={onClear}>
          <Icon name="trash-2" size={16} />
          Clear
        </button>
      </div>

      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item-wrapper">
            <CartItem 
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
            {errors[item.id] && (
              <div className="form-error">{errors[item.id]}</div>
            )}
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="cart-total">
          <span>
            <Icon name="dollar-sign" size={16} />
            Total:
          </span>
          <strong>{formatCurrency(cartTotal)}</strong>
        </div>
      </div>
    </div>
  );
}
