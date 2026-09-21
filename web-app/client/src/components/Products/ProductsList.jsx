import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import ProductForm from './ProductForm';
import LowStockAlert from './LowStockAlert';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import AdminConfirmDialog from '../Common/AdminConfirmDialog';
import Icon from '../../Icon';
import { formatCurrency0, formatCurrency } from '../../constants';
import { normalizePhotoUrl } from '../../utils/api';

export default function ProductsList({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUploadPhoto,   // async (productId, file) => photoUrl
  onDeletePhoto,   // async (productId, photoId) => void
  onRefresh,       // Manual refresh function
  isRefreshing,    // Refreshing state
  lastRefreshTime, // Last refresh timestamp
  canEdit,
  canDelete,
  canViewProfit
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'low-stock', 'out-of-stock'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'stock', 'price', 'profit'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  
  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.serialNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase());

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

      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

      return matchesSearch && matchesFilter && matchesCategory;
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
  }, [products, searchQuery, filter, categoryFilter, sortBy]);

  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity < p.minStock);
  const outOfStockProducts = products.filter(p => p.quantity === 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0);

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

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async (password) => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    const result = await onDeleteProduct(productToDelete.id, password);
    setIsDeleting(false);
    
    if (result.success) {
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    } else {
      alert(result.error || 'Failed to delete product. Please check the admin password.');
    }
  };

  return (
    <div className="erp-products-view products-list">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">
            <Icon name="package" size={22} style={{ color: 'var(--primary)', marginRight: 6 }} />
            Products & Inventory Catalog
          </h2>
          <p className="page-subtitle">
            Manage SKUs, live stock allocations, pricing, and barcode identifiers
            {lastRefreshTime && (
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                • Updated: {new Date(lastRefreshTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
              </span>
            )}
          </p>
        </div>

        <div className="page-actions">
          {/* View Toggle */}
          <div className="table-actions-group" style={{ display: 'flex', gap: '4px', background: 'var(--surface-subtle)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Icon name="table" size={14} />
            </button>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <Icon name="grid" size={14} />
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={onRefresh}
            icon="refresh-cw"
            disabled={isRefreshing}
            className="btn-sm"
          >
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              onClick={() => setShowAddForm(true)}
              icon="plus"
              className="btn-sm"
            >
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Ribbon */}
      <div className="kpi-row" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-primary">
            <Icon name="package" size={18} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Active SKUs</div>
            <div className="kpi-value tabular">{products.length}</div>
            <div className="kpi-sub"><span className="badge badge-success">Catalog Active</span></div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-warning">
            <Icon name="alert-triangle" size={18} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Low Stock</div>
            <div className="kpi-value tabular">{lowStockProducts.length}</div>
            <div className="kpi-sub">
              <span className={`badge ${lowStockProducts.length > 0 ? 'badge-warning' : 'badge-success'}`}>
                {lowStockProducts.length > 0 ? 'Needs Attention' : 'Optimal'}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-danger">
            <Icon name="x-circle" size={18} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Out of Stock</div>
            <div className="kpi-value tabular">{outOfStockProducts.length}</div>
            <div className="kpi-sub">
              <span className={`badge ${outOfStockProducts.length > 0 ? 'badge-danger' : 'badge-success'}`}>
                {outOfStockProducts.length > 0 ? 'Zero Units' : 'None'}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-success">
            <Icon name="trending-up" size={18} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Valuation (Inclusive)</div>
            <div className="kpi-value tabular">{formatCurrency0(totalInventoryValue)}</div>
            <div className="kpi-sub"><span className="badge badge-primary">Asset Value</span></div>
          </div>
        </div>
      </div>

      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <LowStockAlert 
          lowStockProducts={lowStockProducts}
          outOfStockProducts={outOfStockProducts}
        />
      )}

      {/* Search & Filter Toolbar */}
      <div className="table-wrap" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', minWidth: '220px' }}>
            <SearchBar 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU, barcode..."
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
              aria-label="Filter by Stock Status"
            >
              <option value="all">Stock: All Levels</option>
              <option value="low-stock">Stock: Low Stock Alerts</option>
              <option value="out-of-stock">Stock: Out of Stock</option>
            </select>

            {categories.length > 0 && (
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="filter-select"
                aria-label="Filter by Category"
              >
                <option value="all">Category: All</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
              aria-label="Sort products"
            >
              <option value="name">Sort: Product Name</option>
              <option value="stock">Sort: Stock Quantity</option>
              <option value="price">Sort: Selling Price</option>
              {canViewProfit && <option value="profit">Sort: Gross Profit</option>}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: PROFESSIONAL DATA TABLE (Desktop Default) */}
      {viewMode === 'table' ? (
        <div className="table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Product Details</th>
                  <th>SKU / Barcode</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Stock Level</th>
                  <th style={{ textAlign: 'right' }}>Selling Price</th>
                  {canViewProfit && <th style={{ textAlign: 'right' }}>Cost Price</th>}
                  {canViewProfit && <th style={{ textAlign: 'right' }}>Est. Margin</th>}
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedProducts.length > 0 ? (
                  filteredAndSortedProducts.map(product => {
                    const isOut = (product.quantity || 0) <= 0;
                    const isLow = !isOut && (product.quantity || 0) < (product.minStock || 5);
                    const profitVal = (product.price || 0) - (product.costPrice || 0);
                    const profitMargin = product.price > 0 ? ((profitVal / product.price) * 100).toFixed(1) : 0;

                    return (
                      <tr 
                        key={product.id} 
                        className="product-card product-table-row"
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}
                        onClick={() => canEdit && handleEdit(product)}
                        title={canEdit ? "Click to edit product" : ""}
                      >
                        {/* Thumbnail */}
                        <td style={{ textAlign: 'center', padding: '6px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '6px',
                            background: 'var(--surface-subtle)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {product.photo || (product.photos && product.photos[0]) ? (
                              <img
                                src={normalizePhotoUrl(product.photo || product.photos[0])}
                                alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <Icon name="package" size={16} style={{ color: 'var(--text-muted)' }} />
                            )}
                          </div>
                        </td>

                        {/* Product Title */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {product.name}
                          </div>
                          {product.hsnCode && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              HSN: {product.hsnCode}
                            </div>
                          )}
                        </td>

                        {/* SKU / Barcode */}
                        <td>
                          <span className="tabular" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {product.barcode || product.serialNo || '—'}
                          </span>
                        </td>

                        {/* Category */}
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {product.category || 'General'}
                          </span>
                        </td>

                        {/* Stock Quantity */}
                        <td style={{ textAlign: 'right' }}>
                          <span className="tabular" style={{ fontWeight: 700, fontSize: '13.5px' }}>
                            {product.quantity} units
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            / min {product.minStock || 0}
                          </span>
                        </td>

                        {/* Selling Price */}
                        <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular">
                          {formatCurrency(product.price)}
                        </td>

                        {/* Cost Price */}
                        {canViewProfit && (
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="tabular">
                            {formatCurrency(product.costPrice || 0)}
                          </td>
                        )}

                        {/* Margin */}
                        {canViewProfit && (
                          <td style={{ textAlign: 'right' }} className="tabular">
                            <span style={{ 
                              color: profitVal >= 0 ? 'var(--success)' : 'var(--danger)',
                              fontWeight: 600,
                              fontSize: '12px'
                            }}>
                              {profitMargin}%
                            </span>
                          </td>
                        )}

                        {/* Status Badge */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>

                        {/* Row Actions */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canEdit && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                                title="Edit Product"
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--danger)' }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(product); }}
                                title="Delete Product"
                              >
                                <Icon name="trash-2" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canViewProfit ? 10 : 8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Icon name="package" size={32} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>No products matched your search or filters.</span>
                        {searchQuery && (
                          <Button variant="secondary" className="btn-xs" onClick={() => setSearchQuery('')}>
                            Clear search query
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: CARD GRID VIEW */
        <div className="products-grid">
          {filteredAndSortedProducts.length > 0 ? (
            filteredAndSortedProducts.map(product => (
              <ProductCard 
                key={product.id}
                product={product}
                onEdit={canEdit ? handleEdit : null}
                onDelete={canDelete ? () => handleDeleteClick(product) : null}
                onUploadPhoto={canEdit ? onUploadPhoto : null}
                onDeletePhoto={canEdit ? onDeletePhoto : null}
                canViewProfit={canViewProfit}
                canEdit={canEdit}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center' }}>
              <Icon name="package" size={48} color="var(--border-strong)" />
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>No products found</p>
              {searchQuery && (
                <Button 
                  variant="secondary"
                  className="btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddForm && (
        <ProductForm 
          product={editingProduct}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}

      {/* Admin Protected Delete Dialog */}
      <AdminConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Product Deletion"
        message={`Are you sure you want to permanently delete "${productToDelete?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
