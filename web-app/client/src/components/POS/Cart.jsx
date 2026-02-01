import React, { useState } from 'react';
import CartItem from './CartItem';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency } from '../../constants';
import { calculateSubtotal } from '../../utils/calculations';
import './Cart.css';

export default function Cart({ 
  cart, 
  onUpdateQuantity, 
  onRemove, 
  onClear,
  errors = {}
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const cartTotal = calculateSubtotal(cart);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueItems = cart.length;
  
  // Calculate savings if any items have cost price
  const totalSavings = cart.reduce((sum, item) => {
    if (item.originalPrice && item.originalPrice > item.price) {
      return sum + (item.originalPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  if (cart.length === 0) {
    return (
      <div className="cart-next-gen empty">
        <div className="cart-ng-header">
          <div className="cart-ng-title">
            <div className="cart-ng-icon-wrapper">
              <Icon name="shopping-cart" size={22} />
            </div>
            <div>
              <h3>Shopping Cart</h3>
              <span className="cart-ng-subtitle">0 items</span>
            </div>
          </div>
        </div>
        
        <div className="cart-ng-empty">
          <div className="cart-ng-empty-icon">
            <div className="pulse-ring"></div>
            <Icon name="shopping-bag" size={48} />
          </div>
          <h4>Your cart is empty</h4>
          <p>Add products to start your order</p>
          <div className="cart-ng-empty-hint">
            <Icon name="arrow-left" size={16} />
            <span>Browse products on the left</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-next-gen">
      {/* Header with gradient */}
      <div className="cart-ng-header">
        <div className="cart-ng-title">
          <div className="cart-ng-icon-wrapper active">
            <Icon name="shopping-cart" size={22} />
            <span className="cart-ng-badge">{cartCount}</span>
          </div>
          <div>
            <h3>Shopping Cart</h3>
            <span className="cart-ng-subtitle">
              {uniqueItems} {uniqueItems === 1 ? 'product' : 'products'} • {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
        
        <div className="cart-ng-actions">
          <button 
            className="cart-ng-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse cart' : 'Expand cart'}
          >
            <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </button>
          <button 
            className="cart-ng-clear"
            onClick={onClear}
            title="Clear all items"
          >
            <Icon name="trash-2" size={16} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="cart-ng-stats">
        <div className="cart-ng-stat">
          <Icon name="package" size={14} />
          <span>{uniqueItems} Products</span>
        </div>
        <div className="cart-ng-stat">
          <Icon name="layers" size={14} />
          <span>{cartCount} Units</span>
        </div>
        {totalSavings > 0 && (
          <div className="cart-ng-stat savings">
            <Icon name="tag" size={14} />
            <span>Save {formatCurrency(totalSavings)}</span>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className={`cart-ng-items ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {cart.map((item, index) => (
          <div 
            key={item.id} 
            className="cart-ng-item-wrapper"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CartItem 
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
            {errors[item.id] && (
              <div className="cart-ng-error">
                <Icon name="alert-circle" size={14} />
                {errors[item.id]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="cart-ng-footer">
        <div className="cart-ng-summary">
          <div className="cart-ng-summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(cartTotal)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="cart-ng-summary-row discount">
              <span>
                <Icon name="percent" size={12} />
                Discount
              </span>
              <span>-{formatCurrency(totalSavings)}</span>
            </div>
          )}
        </div>
        
        <div className="cart-ng-total">
          <div className="cart-ng-total-label">
            <Icon name="credit-card" size={18} />
            <span>Total Amount</span>
          </div>
          <div className="cart-ng-total-value">
            {formatCurrency(cartTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
