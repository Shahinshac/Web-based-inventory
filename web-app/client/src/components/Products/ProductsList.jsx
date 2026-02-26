import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import LowStockAlert from './LowStockAlert';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';

export default function ProductsList({ 
  products, 
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  canEdit,
  canDelete,
  canViewProfit
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'low-stock', 'out-of-stock'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'price', 'profit'

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      switch (filter) {
        case 'low-stock':
          matchesFilter = product.quantity > 0 && product.quantity < product.minStock;
          break;
        case 'out-of-stock':
          matchesFilter = product.quantity === 0;
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'stock':
          return (b.quantity || 0) - (a.quantity || 0);
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'profit':
          return ((b.price || 0) - (b.costPrice || 0)) - ((a.price || 0) - (a.costPrice || 0));
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, filter, sortBy]);

  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity < p.minStock);
  const outOfStockProducts = products.filter(p => p.quantity === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);
  const totalUnits = products.reduce((sum, p) => sum + (p.quantity || 0), 0);

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowAddForm(true);
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingProduct(null);
  };

  const handleFormSubmit = async (productData) => {
    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, productData);
    } else {
      await onAddProduct(productData);
    }
    handleFormClose();
  };

  return (
    <div className="products-list">
      <div className="products-header">
        <div>
          <h2 className="products-title">
            <Icon name="package" size={24} />
            Products Inventory
          </h2>
          <p className="products-subtitle">
            Manage your products, stock levels and pricing
          </p>
        </div>
        {canEdit && (
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
            icon="plus"
          >
            Add Product
          </Button>
        )}
      </div>

      <div className="products-summary">
        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Icon name="package" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Total Products</span>
            <p className="summary-value">{products.length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Icon name="alert-triangle" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Low Stock</span>
            <p className="summary-value">{lowStockProducts.length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Icon name="x-circle" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Out of Stock</span>
            <p className="summary-value">{outOfStockProducts.length}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Icon name="trending-up" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Inventory Value</span>
            <p className="summary-value">{formatCurrency0(totalInventoryValue)}</p>
          </div>
        </div>
      </div>

      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <LowStockAlert 
          lowStockProducts={lowStockProducts}
          outOfStockProducts={outOfStockProducts}
        />
      )}

      <div className="products-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name, serial, barcode..."
        />

        <div className="products-filters">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Products</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="stock">Sort by Stock</option>
            <option value="price">Sort by Price</option>
            {canViewProfit && <option value="profit">Sort by Profit</option>}
          </select>
        </div>
      </div>

      <div className="products-grid">
        {filteredAndSortedProducts.length > 0 ? (
          filteredAndSortedProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product}
              onEdit={canEdit ? handleEdit : null}
              onDelete={canDelete ? onDeleteProduct : null}
              canViewProfit={canViewProfit}
            />
          ))
        ) : (
          <div className="empty-state">
            <Icon name="package" size={64} color="#cbd5e1" />
            <p>No products found</p>
            {searchQuery && (
              <Button 
                variant="secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {showAddForm && (
        <ProductForm 
          product={editingProduct}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
