import React from 'react';
import Icon from '../../Icon';

export default function LowStockAlert({ lowStockProducts, outOfStockProducts }) {
  if (lowStockProducts.length === 0 && outOfStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="low-stock-alert">
      {outOfStockProducts.length > 0 && (
        <div className="alert alert-danger">
          <Icon name="x-circle" size={20} />
          <div className="alert-content">
            <strong>Out of Stock:</strong>
            <span>{outOfStockProducts.length} products are completely out of stock</span>
          </div>
        </div>
      )}

      {lowStockProducts.length > 0 && (
        <div className="alert alert-warning">
          <Icon name="alert-triangle" size={20} />
          <div className="alert-content">
            <strong>Low Stock:</strong>
            <span>{lowStockProducts.length} products are running low on stock</span>
          </div>
        </div>
      )}

      <details className="alert-details">
        <summary>View Products</summary>
        <div className="alert-products-list">
          {outOfStockProducts.map(product => (
            <div key={product.id} className="alert-product-item out-of-stock">
              <span className="product-name">{product.name}</span>
              <span className="product-status">
                <Icon name="x-circle" size={14} />
                Out of Stock
              </span>
            </div>
          ))}
          {lowStockProducts.map(product => (
            <div key={product.id} className="alert-product-item low-stock">
              <span className="product-name">{product.name}</span>
              <span className="product-status">
                <Icon name="alert-triangle" size={14} />
                {product.quantity} / {product.minStock}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
