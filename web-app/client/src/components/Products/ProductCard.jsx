import React, { useState } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import { formatCurrency } from '../../constants';
import { normalizePhotoUrl } from '../../utils/api';

export default function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  onUploadPhoto,
  canViewProfit 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const profit = product.price - (product.costPrice || 0);
  const profitMargin = product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;

  const stockStatus = product.quantity === 0 
    ? 'out-of-stock' 
    : product.quantity < product.minStock 
    ? 'low-stock' 
    : 'in-stock';

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadPhoto) {
      onUploadPhoto(product.id, file);
    }
  };

  return (
    <>
      <div className={`product-card ${stockStatus}`}>
        <div className="product-card-image">
          {product.photo ? (
            <img src={normalizePhotoUrl(product.photo)} alt={product.name} />
          ) : (
            <div className="product-placeholder">
              <Icon name="package" size={48} color="#cbd5e1" />
            </div>
          )}
          {onUploadPhoto && (
            <label className="photo-upload-btn" title="Upload photo">
              <Icon name="camera" size={16} />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
          <div className={`stock-badge ${stockStatus}`}>
            {product.quantity === 0 ? (
              <>
                <Icon name="x-circle" size={14} />
                Out of Stock
              </>
            ) : product.quantity < product.minStock ? (
              <>
                <Icon name="alert-triangle" size={14} />
                Low Stock
              </>
            ) : (
              <>
                <Icon name="check-circle" size={14} />
                In Stock
              </>
            )}
          </div>
        </div>

        <div className="product-card-body">
          <h3 className="product-card-title">{product.name}</h3>
          
          <div className="product-card-info">
            <div className="info-row">
              <span className="info-label">Price:</span>
              <span className="info-value">{formatCurrency(product.price)}</span>
            </div>
            
            {canViewProfit && (
              <div className="info-row">
                <span className="info-label">Profit:</span>
                <span className="info-value profit">
                  {formatCurrency(profit)} ({profitMargin}%)
                </span>
              </div>
            )}
            
            <div className="info-row">
              <span className="info-label">Stock:</span>
              <span className={`info-value stock-${stockStatus}`}>
                {product.quantity} units
              </span>
            </div>

            {product.serialNo && (
              <div className="info-row">
                <span className="info-label">Serial:</span>
                <span className="info-value">{product.serialNo}</span>
              </div>
            )}
          </div>

          <div className="product-card-actions">
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              icon={showDetails ? 'chevron-up' : 'chevron-down'}
            >
              {showDetails ? 'Less' : 'More'}
            </Button>
            
            {onEdit && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => onEdit(product)}
                icon="edit"
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="danger"
                size="small"
                onClick={() => setShowDeleteConfirm(true)}
                icon="trash-2"
              >
                Delete
              </Button>
            )}
          </div>

          {showDetails && (
            <div className="product-details">
              <div className="detail-row">
                <span>Min Stock:</span>
                <span>{product.minStock}</span>
              </div>
              <div className="detail-row">
                <span>HSN Code:</span>
                <span>{product.hsnCode || 'N/A'}</span>
              </div>
              {product.barcode && (
                <div className="detail-row">
                  <span>Barcode:</span>
                  <span>{product.barcode}</span>
                </div>
              )}
              {canViewProfit && product.costPrice && (
                <div className="detail-row">
                  <span>Cost Price:</span>
                  <span>{formatCurrency(product.costPrice)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(product.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
