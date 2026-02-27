import React, { useState, useMemo, useRef } from 'react';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';
import { normalizePhotoUrl } from '../../utils/api';

export default function ProductSearch({ products, onProductSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const inputRef = useRef(null);

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
    <div className="pos-product-search">
      {/* ── Modern search bar ── */}
      <div className="pos-search-bar" onClick={() => inputRef.current?.focus()}>
        <Icon name="search" size={20} className="pos-search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search products by name..."
          autoFocus
        />
        {searchQuery && (
          <button className="pos-search-clear" onClick={() => setSearchQuery('')}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {/* ── Category pills ── */}
      {categories.length > 1 && (
        <div className="pos-category-strip">
          {categories.map(cat => (
            <button
              key={cat}
              className={`pos-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'All Products' : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Product grid ── */}
      <div className="pos-products-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => {
            const isOut = product.quantity === 0;
            const isLow = product.quantity > 0 && product.quantity < (product.minStock || 5);
            const photoUrl = normalizePhotoUrl(product.photo);

            return (
              <div 
                key={product.id || product._id}
                className={`pos-product-card ${isOut ? 'out-of-stock' : ''}`}
                onClick={() => !isOut && onProductSelect(product)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && !isOut && onProductSelect(product)}
              >
                {/* Thumbnail */}
                <div className="pos-card-thumb">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={product.name}
                      loading="lazy"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <span className="pos-card-thumb-placeholder" style={{ display: photoUrl ? 'none' : 'flex' }}>
                    <Icon name="package" size={28} />
                  </span>

                  {/* Stock badge overlay */}
                  {isOut && <span className="pos-stock-badge out">Out of Stock</span>}
                  {isLow && <span className="pos-stock-badge low">{product.quantity} left</span>}
                </div>

                {/* Info area */}
                <div className="pos-card-body">
                  <span className="pos-card-name">{product.name}</span>
                  <div className="pos-card-footer">
                    <span className="pos-card-price">{formatCurrency(product.price)}</span>
                    {!isOut && (
                      <span className="pos-card-stock">
                        <Icon name="check-circle" size={12} />
                        {product.quantity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick-add button */}
                {!isOut && (
                  <button className="pos-add-btn" aria-label="Add to cart" onClick={e => { e.stopPropagation(); onProductSelect(product); }}>
                    <Icon name="plus" size={16} />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <Icon name="package" size={56} color="#cbd5e1" />
            <p>{searchQuery ? 'No products match your search' : 'No products found'}</p>
            {searchQuery && (
              <button className="pos-clear-btn" onClick={() => setSearchQuery('')}>
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
