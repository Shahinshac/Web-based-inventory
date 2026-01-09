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

  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <h4 className="cart-item-name">{item.name}</h4>
        <p className="cart-item-price">{formatCurrency(item.price)} each</p>
      </div>

      <div className="cart-item-controls">
        <div className="quantity-controls">
          <button 
            className="qty-btn"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Icon name="minus" size={14} />
          </button>
          <input
            type="number"
            className="qty-input"
            value={item.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              handleQuantityChange(val);
            }}
            min="1"
            max={item.maxStock}
          />
          <button 
            className="qty-btn"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={item.quantity >= item.maxStock}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>

        <div className="cart-item-total">
          {formatCurrency(itemTotal)}
        </div>

        <button 
          className="remove-btn"
          onClick={() => onRemove(item.id)}
          title="Remove from cart"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {item.quantity >= item.maxStock && (
        <div className="cart-item-warning">
          <Icon name="alert-triangle" size={14} />
          <span>Maximum stock reached</span>
        </div>
      )}
    </div>
  );
}
