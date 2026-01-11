import React from 'react';
import CartItem from './CartItem';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency } from '../../constants';
import { calculateSubtotal } from '../../utils/calculations';

// Cart component now accepts `errors` prop to display inline validation messages for items


export default function Cart({ 
  cart, 
  onUpdateQuantity, 
  onRemove, 
  onClear,
  errors = {}
}) {
  const cartTotal = calculateSubtotal(cart)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="cart empty" style={{ minHeight: '300px' }}>
        <div className="cart-header" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h3 className="cart-title" style={{ fontSize: '16px' }}>
            <Icon name="shopping-cart" size={20} />
            Shopping Cart
          </h3>
        </div>
        <div className="cart-empty-state" style={{ padding: '36px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ 
            animation: 'bounce 2s infinite',
            marginBottom: '12px'
          }}>
            <Icon name="shopping-cart" size={56} color="#cbd5e1" />
          </div>
          <p style={{ fontSize: '16px', marginTop: '12px', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Your cart is empty</p>
          <small style={{ fontSize: '14px', color: '#64748b' }}>Add products to get started</small>
        </div>
      </div>
    );
  }

  return (
    <div className="cart" style={{ 
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
      position: 'relative'
    }}>
      <div className="cart-header" style={{ 
        padding: '16px 20px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 className="cart-title" style={{ fontSize: '16px', position: 'relative', zIndex: 1 }}>
          <Icon name="shopping-cart" size={20} />
          Cart
          <span className="cart-count" style={{ 
            fontSize: '12px',
            background: 'rgba(255,255,255,0.25)',
            padding: '4px 10px',
            borderRadius: '20px',
            marginLeft: '8px',
            fontWeight: '700'
          }}>
            {cartCount}
          </span>
        </h3>
        <Button 
          variant="ghost" 
          size="small"
          onClick={onClear}
          icon="trash-2"
          style={{ color: 'white', opacity: 0.9, padding: '8px 12px', fontSize: '13px' }}
        >
          Clear
        </Button>
      </div>

      <div 
        className="cart-items" 
        style={{ 
          padding: '12px 16px', 
          gap: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '360px',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          position: 'relative'
        }}
      >
        {cart.map((item, index) => (
          <div
            key={item.id}
            style={{
              animation: `slideInCart 0.2s ease-out ${index * 0.03}s backwards`
            }}
          >
            <CartItem 
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
            {errors[item.id] && (
              <div className="form-error" style={{ marginTop: '6px', fontSize: '13px' }}>{errors[item.id]}</div>
            )}
          </div>
        ))}
      </div>

      <div className="cart-summary" style={{ 
        padding: '16px 20px', 
        borderTop: '1px solid #e6eef8', 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        position: 'relative'
      }}>
        <div className="cart-total" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '16px', 
          fontWeight: '600'
        }}>
          <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="dollar-sign" size={16} />
            Total:
          </span>
          <strong style={{ 
            fontSize: '18px', 
            color: '#1e293b'
          }}>
            {formatCurrency(cartTotal)}
          </strong>
        </div>
      </div>

      <style>{`
        @keyframes slideInCart {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .cart-items::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }

        .cart-items::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .cart-items::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          transition: background 0.3s;
        }

        .cart-items::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        }

        .form-error { color: var(--accent-danger); font-size: 13px; margin-top: 6px }
      `}</style>
    </div>
  );
}
