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
    <div 
      className="cart-item" 
      style={{ 
        padding: '16px', 
        gap: '16px', 
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}
    >
      <div className="cart-item-info" style={{ flex: '1 1 auto' }}>
        <h4 className="cart-item-name" style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
          {item.name}
        </h4>
        <p className="cart-item-price" style={{ fontSize: '14px', color: '#64748b' }}>
          {formatCurrency(item.price)} × {item.quantity}
        </p>
      </div>

      <div className="cart-item-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          className="qty-control" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            background: 'white', 
            borderRadius: '12px', 
            padding: '6px',
            border: '1px solid #e2e8f0'
          }}
        >
          <button 
            className="qty-btn decrease"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background: '#fee2e2',
              color: '#dc2626',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.target.style.background = '#dc2626'; e.target.style.color = 'white'; }}
            onMouseOut={(e) => { e.target.style.background = '#fee2e2'; e.target.style.color = '#dc2626'; }}
          >
            −
          </button>
          <span 
            className="qty-value" 
            style={{ 
              minWidth: '40px', 
              textAlign: 'center', 
              fontSize: '16px', 
              fontWeight: '600',
              color: '#1e293b'
            }}
          >
            {item.quantity}
          </span>
          <button 
            className="qty-btn increase"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={item.quantity >= item.maxStock}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background: item.quantity >= item.maxStock ? '#e2e8f0' : '#dcfce7',
              color: item.quantity >= item.maxStock ? '#94a3b8' : '#16a34a',
              fontSize: '18px',
              fontWeight: '700',
              cursor: item.quantity >= item.maxStock ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { if (!e.target.disabled) { e.target.style.background = '#16a34a'; e.target.style.color = 'white'; } }}
            onMouseOut={(e) => { if (!e.target.disabled) { e.target.style.background = '#dcfce7'; e.target.style.color = '#16a34a'; } }}
          >
            +
          </button>
        </div>

        <div 
          className="cart-item-total" 
          style={{ 
            fontSize: '16px', 
            fontWeight: '700', 
            color: '#1e293b',
            minWidth: '80px',
            textAlign: 'right'
          }}
        >
          {formatCurrency(itemTotal)}
        </div>

        <button 
          className="remove-item-btn"
          onClick={() => onRemove(item.id)}
          title="Remove from cart"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            border: 'none',
            background: '#fef2f2',
            color: '#dc2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#dc2626';
            e.currentTarget.style.color = 'white';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#fef2f2';
            e.currentTarget.style.color = '#dc2626';
          }}
        >
          <Icon name="trash-2" size={18} />
        </button>
      </div>
    </div>
  );
}
