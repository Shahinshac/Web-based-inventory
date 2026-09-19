import React, { useState } from 'react';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const [isRemoving, setIsRemoving] = useState(false);
  const lastActionTime = React.useRef(0);

  const handleQuantityChange = (newQty) => {
    const now = Date.now();
    if (now - lastActionTime.current < 40) return;
    lastActionTime.current = now;
    const parsed = Math.floor(Number(newQty));
    if (isNaN(parsed) || parsed <= 0) {
      handleRemove();
    } else if (parsed <= (item.maxStock ?? 999999)) {
      onUpdateQuantity(item.id, parsed);
    }
  };

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(item.id);
    }, 200);
  };

  const itemTotal = item.price * item.quantity;
  const isMaxStock = item.quantity >= item.maxStock;
  const isLowStock = item.maxStock - item.quantity <= 2 && item.maxStock - item.quantity > 0;
  const stockRemaining = item.maxStock - item.quantity;

  return (
    <div className={`cart-ng-item ${isRemoving ? 'removing' : ''}`}>
      {/* Product Image/Icon */}
      <div className="cart-ng-item-visual">
        {item.photo ? (
          <img src={item.photo} alt={item.name} />
        ) : (
          <div className="cart-ng-item-placeholder">
            <Icon name="package" size={20} />
          </div>
        )}
        {item.quantity > 1 && (
          <span className="cart-ng-item-qty-badge">{item.quantity}</span>
        )}
      </div>

      {/* Product Details */}
      <div className="cart-ng-item-details">
        <h4 className="cart-ng-item-name">{item.name}</h4>
        <div className="cart-ng-item-meta">
          <span className="cart-ng-item-price">{formatCurrency(item.price)}</span>
          <span className="cart-ng-item-multiply">×</span>
          <span className="cart-ng-item-count">{item.quantity}</span>
        </div>
        {isLowStock && (
          <div className="cart-ng-item-stock-warn">
            <Icon name="alert-circle" size={12} />
            Only {stockRemaining} left
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="cart-ng-item-controls">
        <div className="cart-ng-qty">
          <button 
            className="cart-ng-qty-btn minus"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            aria-label="Decrease quantity"
          >
            <Icon name="minus" size={14} />
          </button>
          
          <span className="cart-ng-qty-value">{item.quantity}</span>
          
          <button 
            className="cart-ng-qty-btn plus"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isMaxStock}
            aria-label="Increase quantity"
            title={isMaxStock ? 'Maximum stock reached' : 'Add more'}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>

        {/* Item Total */}
        <div className="cart-ng-item-total">
          {formatCurrency(itemTotal)}
        </div>

        {/* Remove Button */}
        <button 
          className="cart-ng-remove"
          onClick={handleRemove}
          title="Remove from cart"
          aria-label="Remove item"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
    </div>
  );
}