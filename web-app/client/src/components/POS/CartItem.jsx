import React from 'react';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  const handleQuantityChange = (newQty) => {
    if (newQty <= 0) {
      onRemove(item.id);
    } else if (newQty <= item.maxStock) {
      onUpdateQuantity(item.id, newQty);
    }
  };

  const itemTotal = item.price * item.quantity;
  const isMaxStock = item.quantity >= item.maxStock;

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <h4 className="cart-item-name">{item.name}</h4>
        <p className="cart-item-price">
          {formatCurrency(item.price)} × {item.quantity}
        </p>
      </div>

      <div className="cart-item-controls">
        <div className="qty-control">
          <button 
            className="qty-btn decrease"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="qty-value">{item.quantity}</span>
          <button 
            className="qty-btn increase"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isMaxStock}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <div className="cart-item-total">
          {formatCurrency(itemTotal)}
        </div>

        <button 
          className="remove-item-btn"
          onClick={() => onRemove(item.id)}
          title="Remove from cart"
          aria-label="Remove item"
        >
          <Icon name="trash-2" size={18} />
        </button>
      </div>
    </div>
  );
}