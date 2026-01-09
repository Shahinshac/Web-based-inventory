import React, { useState, useMemo } from 'react';
import SearchBar from '../Common/SearchBar';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';
import { normalizePhotoUrl } from '../../utils/api';

export default function ProductSearch({ products, onProductSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchQuery === '' || 
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="product-search">
      <div className="search-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name, serial, or barcode..."
          autoFocus
        />
        
        {categories.length > 1 && (
          <div className="category-filter">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <div 
              key={product.id}
              className={`product-card ${product.quantity === 0 ? 'out-of-stock' : ''}`}
              onClick={() => product.quantity > 0 && onProductSelect(product)}
            >
              {product.photo && (
                <div className="product-image">
                  <img 
                    src={normalizePhotoUrl(product.photo)} 
                    alt={product.name}
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <div className="product-meta">
                  <span className="product-price">{formatCurrency(product.price)}</span>
                  <span className={`product-stock ${product.quantity === 0 ? 'out' : product.quantity < product.minStock ? 'low' : ''}`}>
                    {product.quantity === 0 ? (
                      <>
                        <Icon name="x-circle" size={14} />
                        Out of Stock
                      </>
                    ) : product.quantity < product.minStock ? (
                      <>
                        <Icon name="alert-triangle" size={14} />
                        {product.quantity} left
                      </>
                    ) : (
                      <>
                        <Icon name="check-circle" size={14} />
                        {product.quantity} in stock
                      </>
                    )}
                  </span>
                </div>
              </div>
              {product.quantity > 0 && (
                <button className="add-to-cart-btn">
                  <Icon name="plus" size={18} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Icon name="package" size={64} color="#cbd5e1" />
            <p>No products found</p>
            {searchQuery && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
