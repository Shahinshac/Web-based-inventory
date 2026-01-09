import React, { useState, useMemo } from 'react';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';

export default function StockManagement({ 
  products, 
  onUpdateProduct, 
  canEdit 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [adjustmentModal, setAdjustmentModal] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Calculate stock statistics
  const stockStats = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.cost || p.price || 0)), 0);
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity < (p.minStock || 5));
    const outOfStock = products.filter(p => p.quantity === 0);
    const wellStocked = products.filter(p => p.quantity >= (p.minStock || 5));

    return {
      totalProducts,
      totalStock,
      totalValue,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      wellStockedCount: wellStocked.length
    };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    // Apply stock filter
    if (stockFilter === 'low') {
      filtered = filtered.filter(p => p.quantity > 0 && p.quantity < (p.minStock || 5));
    } else if (stockFilter === 'out') {
      filtered = filtered.filter(p => p.quantity === 0);
    } else if (stockFilter === 'well') {
      filtered = filtered.filter(p => p.quantity >= (p.minStock || 5));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'quantity-asc':
          return (a.quantity || 0) - (b.quantity || 0);
        case 'quantity-desc':
          return (b.quantity || 0) - (a.quantity || 0);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'value':
          return ((b.quantity || 0) * (b.cost || 0)) - ((a.quantity || 0) * (a.cost || 0));
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, stockFilter, sortBy]);

  const handleStockAdjustment = async (type) => {
    if (!adjustmentModal || adjustmentQty <= 0) return;

    const product = adjustmentModal;
    const newQuantity = type === 'add' 
      ? product.quantity + adjustmentQty 
      : Math.max(0, product.quantity - adjustmentQty);

    try {
      await onUpdateProduct(product._id || product.id, {
        ...product,
        quantity: newQuantity
      });
      setAdjustmentModal(null);
      setAdjustmentQty(0);
      setAdjustmentReason('');
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  const getStockStatus = (product) => {
    if (product.quantity === 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (product.quantity < (product.minStock || 5)) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'In Stock', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
  };

  return (
    <div className="stock-management-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}>
            <Icon name="package" size={28} />
          </div>
          <div className="header-text">
            <h1>Inventory Management</h1>
            <p>Monitor and manage your stock levels</p>
          </div>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="stock-overview">
        <div className="overview-card total">
          <div className="overview-icon">
            <Icon name="package" size={24} />
          </div>
          <div className="overview-info">
            <span className="overview-value">{stockStats.totalProducts}</span>
            <span className="overview-label">Total Products</span>
          </div>
        </div>
        <div className="overview-card units">
          <div className="overview-icon">
            <Icon name="layers" size={24} />
          </div>
          <div className="overview-info">
            <span className="overview-value">{stockStats.totalStock.toLocaleString()}</span>
            <span className="overview-label">Total Units</span>
          </div>
        </div>
        <div className="overview-card value">
          <div className="overview-icon">
            <Icon name="rupee" size={24} />
          </div>
          <div className="overview-info">
            <span className="overview-value">{formatCurrency(stockStats.totalValue)}</span>
            <span className="overview-label">Stock Value</span>
          </div>
        </div>
        <div className="overview-card low" onClick={() => setStockFilter('low')}>
          <div className="overview-icon warning">
            <Icon name="alert-triangle" size={24} />
          </div>
          <div className="overview-info">
            <span className="overview-value">{stockStats.lowStockCount}</span>
            <span className="overview-label">Low Stock Items</span>
          </div>
        </div>
        <div className="overview-card out" onClick={() => setStockFilter('out')}>
          <div className="overview-icon danger">
            <Icon name="x-circle" size={24} />
          </div>
          <div className="overview-info">
            <span className="overview-value">{stockStats.outOfStockCount}</span>
            <span className="overview-label">Out of Stock</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="stock-filters">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search products by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select 
            value={stockFilter} 
            onChange={(e) => setStockFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Products</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="well">Well Stocked</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity-asc">Quantity: Low to High</option>
            <option value="quantity-desc">Quantity: High to Low</option>
            <option value="value">Stock Value</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="stock-table-container">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="package" size={48} />
            </div>
            <h3>No Products Found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Status</th>
                <th>Stock Value</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const status = getStockStatus(product);
                return (
                  <tr key={product._id || product.id || index}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">
                          {product.photo ? (
                            <img src={product.photo} alt={product.name} />
                          ) : (
                            <Icon name="package" size={20} />
                          )}
                        </div>
                        <span className="product-name">{product.name}</span>
                      </div>
                    </td>
                    <td><span className="sku-badge">{product.sku || '-'}</span></td>
                    <td>{product.category || 'Uncategorized'}</td>
                    <td>
                      <span className={`stock-qty ${product.quantity === 0 ? 'zero' : product.quantity < (product.minStock || 5) ? 'low' : ''}`}>
                        {product.quantity || 0}
                      </span>
                    </td>
                    <td>{product.minStock || 5}</td>
                    <td>
                      <span className="status-badge" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td>{formatCurrency((product.quantity || 0) * (product.cost || product.price || 0))}</td>
                    {canEdit && (
                      <td>
                        <button 
                          className="adjust-btn"
                          onClick={() => setAdjustmentModal(product)}
                        >
                          <Icon name="edit" size={16} />
                          Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustmentModal && (
        <div className="modal-overlay" onClick={() => setAdjustmentModal(null)}>
          <div className="modal-content adjustment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adjust Stock</h2>
              <button className="close-btn" onClick={() => setAdjustmentModal(null)}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="product-info">
                <strong>{adjustmentModal.name}</strong>
                <span>Current Stock: {adjustmentModal.quantity || 0}</span>
              </div>
              <div className="adjustment-input">
                <label>Quantity to Adjust</label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="adjustment-input">
                <label>Reason (Optional)</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Restocking, Damaged goods, etc."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-success"
                onClick={() => handleStockAdjustment('add')}
                disabled={adjustmentQty <= 0}
              >
                <Icon name="plus" size={16} />
                Add Stock
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => handleStockAdjustment('remove')}
                disabled={adjustmentQty <= 0 || adjustmentQty > adjustmentModal.quantity}
              >
                <Icon name="minus" size={16} />
                Remove Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
