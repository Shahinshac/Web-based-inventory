import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import LowStockAlert from './LowStockAlert';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function ProductsList({ 
  products, 
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUploadPhoto,
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
          <h2 className="products-title">📦 Products Inventory</h2>
          <p className="products-subtitle">
            {products.length} total products
            {lowStockProducts.length > 0 && ` • ${lowStockProducts.length} low stock`}
            {outOfStockProducts.length > 0 && ` • ${outOfStockProducts.length} out of stock`}
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
          placeholder="Search products..."
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
              onUploadPhoto={canEdit ? onUploadPhoto : null}
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
