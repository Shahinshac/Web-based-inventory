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
        <div className="cart-header" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <h3 className="cart-title" style={{ fontSize: '18px' }}>
            <Icon name="shopping-cart" size={24} />
            Shopping Cart
          </h3>
        </div>
        <div className="cart-empty-state" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <div style={{ 
            animation: 'bounce 2s infinite',
            marginBottom: '16px'
          }}>
            <Icon name="shopping-cart" size={72} color="#cbd5e1" />
          </div>
          <p style={{ fontSize: '16px', marginTop: '16px', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Your cart is empty</p>
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
        padding: '20px 24px', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent)',
          pointerEvents: 'none'
        }}></div>
        <h3 className="cart-title" style={{ fontSize: '18px', position: 'relative', zIndex: 1 }}>
          <Icon name="shopping-cart" size={24} />
          Cart
          <span className="cart-count" style={{ 
            fontSize: '14px',
            background: 'rgba(255,255,255,0.25)',
            padding: '4px 12px',
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
          style={{ color: 'white', opacity: 0.9, padding: '8px 16px', fontSize: '14px', position: 'relative', zIndex: 1 }}
        >
          Clear
        </Button>
      </div>

      {/* Scroll indicator at top */}
      {cart.length > 3 && (
        <div style={{
          position: 'absolute',
          top: '76px',
          left: 0,
          right: 0,
          height: '20px',
          background: 'linear-gradient(to bottom, rgba(248,249,250,0.9), transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}></div>
      )}

      <div 
        className="cart-items" 
        style={{ 
          padding: '20px', 
          gap: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '400px',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          position: 'relative'
        }}
      >
        {cart.map((item, index) => (
          <div
            key={item.id}
            style={{
              animation: `slideInCart 0.3s ease-out ${index * 0.05}s backwards`
            }}
          >
            <CartItem 
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>

      {/* Scroll indicator at bottom */}
      {cart.length > 3 && (
        <div style={{
          position: 'absolute',
          bottom: '90px',
          left: 0,
          right: 0,
          height: '20px',
          background: 'linear-gradient(to top, rgba(248,249,250,0.9), transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}></div>
      )}

      <div className="cart-summary" style={{ 
        padding: '20px 24px', 
        borderTop: '2px solid #e2e8f0', 
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        position: 'relative'
      }}>
        <div className="cart-total" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '18px', 
          fontWeight: '600',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="dollar-sign" size={20} />
            Total:
          </span>
          <strong style={{ 
            fontSize: '22px', 
            color: '#1e293b',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {formatCurrency(cartTotal)}
          </strong>
        </div>
      </div>

      <style>{`
        @keyframes slideInCart {
          from {
            opacity: 0;
            transform: translateX(-20px);
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
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .cart-items::-webkit-scrollbar {
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
      `}</style>
    </div>
  );
}
