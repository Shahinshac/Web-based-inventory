import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import Icon from '../../Icon';
import { getApiBaseUrl, getAuthHeaders } from '../../utils/api';
import './ProductForm.css';

export default function ProductForm({ product, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: 0,
    price: 0,
    costPrice: 0,
    hsnCode: '9999',
    minStock: 10,
    serialNo: '',
    barcode: '',
    photos: [] // Array of product photos
  });

  const [errors, setErrors] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Stores { photoId, photoUrl } for confirmation

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        quantity: product.quantity || 0,
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        hsnCode: product.hsnCode || '9999',
        minStock: product.minStock || 10,
        serialNo: product.serialNo || '',
        barcode: product.barcode || '',
        photos: product.photos || [] // Load existing photos
      });
    }
  }, [product]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }

    if (formData.minStock < 0) {
      newErrors.minStock = 'Min stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculate profit
  const profit = formData.price && formData.costPrice ? formData.price - formData.costPrice : 0;
  const profitPercentage = formData.costPrice > 0 ? ((profit / formData.costPrice) * 100).toFixed(1) : 0;

  // Stock status
  const getStockStatus = () => {
    if (formData.quantity === 0) return { text: 'Out of Stock', className: 'out-of-stock', icon: '🔴' };
    if (formData.quantity < formData.minStock) return { text: 'Low Stock', className: 'low-stock', icon: '🟡' };
    return { text: 'In Stock', className: 'in-stock', icon: '🟢' };
  };

  const stockStatus = getStockStatus();

  // Handle photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Only allow upload if product exists (has ID)
    if (!product || !product.id) {
      alert('Please save the product first before uploading photos');
      return;
    }

    setUploadingPhoto(true);

    try {
      // Get current user info from localStorage
      let storedUserId = '';
      let storedUsername = '';
      try {
        const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        storedUserId = storedUser.id || storedUser._id || '';
        storedUsername = storedUser.username || '';
      } catch (e) { /* ignore parse errors */ }

      // Upload each file
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('photo', file);
        formDataUpload.append('userId', storedUserId);
        formDataUpload.append('username', storedUsername);

        const response = await fetch(`${getApiBaseUrl()}/api/products/${product.id}/photo`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formDataUpload
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload photo');
        }

        const data = await response.json();
        console.log('✅ Photo upload response:', data);
        
        // Fetch updated product to get the complete photo object
        if (data.success) {
          const productResponse = await fetch(`${getApiBaseUrl()}/api/products`, {
            headers: getAuthHeaders()
          });
          if (productResponse.ok) {
            const products = await productResponse.json();
            const updatedProduct = products.find(p => p.id === product.id);
            
            if (updatedProduct && updatedProduct.photos) {
              console.log('✅ Updated product photos:', updatedProduct.photos);
              setFormData(prev => ({
                ...prev,
                photos: updatedProduct.photos
              }));
            }
          }
        }
      }
      
      alert('Photos uploaded successfully!');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      alert('Failed to upload photo: ' + error.message);
    } finally {
      setUploadingPhoto(false);
      // Clear the input so same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  // Handle photo deletion with confirmation
  const handleDeletePhoto = (photoId, photoUrl) => {
    setDeleteConfirm({ photoId, photoUrl });
  };

  const confirmDeletePhoto = async () => {
    if (!deleteConfirm || !product || !product.id) return;

    try {
      const userId = localStorage.getItem('userId') || '';
      const username = localStorage.getItem('username') || '';
      
      const response = await fetch(
        `${getApiBaseUrl()}/api/products/${product.id}/photo/${deleteConfirm.photoId}?userId=${userId}&username=${username}&confirmed=true`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      // Remove photo from formData
      setFormData(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p.id !== deleteConfirm.photoId)
      }));

      // Close confirmation dialog
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo: ' + error.message);
    }
  };

  return (
    <div className="product-form-modal">
      <Modal 
        isOpen={true}
        onClose={onClose}
        title={product ? '✏️ Edit Product' : '✨ Add New Product'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="product-form">
          
          {/* Section 1: Basic Information */}
          <div className="form-section basic">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="package" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Basic Information</h3>
            </div>
            
            <Input
              label="Product Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter product name"
              required
              error={errors.name}
            />
          </div>

          {/* Section 2: Pricing & Profit */}
          <div className="form-section pricing">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="rupee" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Pricing & Profit</h3>
            </div>
            
            <div className="form-row">
              <Input
                label="Selling Price (₹)"
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                error={errors.price}
              />

              <Input
                label="Cost Price (₹)"
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {formData.price > 0 && formData.costPrice > 0 && (
              <div className={`info-box ${profit >= 0 ? 'profit' : 'loss'}`}>
                <span className="info-box-icon">
                  <Icon name="trending-up" size={20} color={profit >= 0 ? '#10b981' : '#ef4444'} />
                </span>
                <div className="info-box-content">
                  <p className="info-box-title" style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>
                    {profit >= 0 ? 'Profit' : 'Loss'} per unit
                  </p>
                </div>
                <div className="info-box-value">
                  <div className="amount" style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>
                    ₹{Math.abs(profit).toFixed(2)}
                  </div>
                  <div className="percent" style={{ color: profit >= 0 ? '#059669' : '#dc2626' }}>
                    ({profitPercentage > 0 ? '+' : ''}{profitPercentage}%)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Inventory Management */}
          <div className="form-section inventory">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="layers" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Inventory Management</h3>
            </div>
            
            <div className="form-row">
              <Input
                label="Current Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                required
                error={errors.quantity}
              />

              <Input
                label="Min Stock Alert"
                type="number"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
                placeholder="10"
                min="0"
                error={errors.minStock}
              />
            </div>

            {formData.quantity >= 0 && (
              <div className={`info-box ${stockStatus.className}`}>
                <span className="info-box-icon">{stockStatus.icon}</span>
                <div className="info-box-content">
                  <p className="info-box-title" style={{ color: stockStatus.className === 'in-stock' ? '#10b981' : stockStatus.className === 'low-stock' ? '#f59e0b' : '#ef4444' }}>
                    {stockStatus.text}
                  </p>
                  <p className="info-box-subtitle">
                    {formData.quantity} {formData.quantity === 1 ? 'unit' : 'units'} available
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Product Tracking */}
          <div className="form-section tracking">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="file-text" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Product Tracking</h3>
            </div>
            
            <div className="form-row">
              <Input
                label="Serial Number"
                value={formData.serialNo}
                onChange={(e) => handleChange('serialNo', e.target.value)}
                placeholder="Optional"
              />

              <Input
                label="Barcode"
                value={formData.barcode}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <Input
              label="HSN Code"
              value={formData.hsnCode}
              onChange={(e) => handleChange('hsnCode', e.target.value)}
              placeholder="9999"
              helperText="Harmonized System of Nomenclature code for GST"
            />
          </div>

          {/* Section 5: Product Photos */}
          <div className="form-section photos">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="image" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Product Photos</h3>
            </div>

            {product && product.id ? (
              <>
                {/* Photo Upload */}
                <div className="photo-upload-section">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingPhoto}
                  />
                  <label htmlFor="photo-upload" className={`photo-upload-btn ${uploadingPhoto ? 'uploading' : ''}`}>
                    <Icon name={uploadingPhoto ? 'loader' : 'upload'} size={20} />
                    <span>{uploadingPhoto ? 'Uploading...' : 'Upload Photos'}</span>
                  </label>
                  <p className="photo-upload-hint">
                    Click to upload product photos. Supports multiple images.
                  </p>
                </div>

                {/* Photo Grid */}
                {formData.photos && formData.photos.length > 0 ? (
                  <div className="photo-grid">
                    {formData.photos.map((photo) => (
                      <div key={photo.id} className="photo-item">
                        <img 
                          src={`${getApiBaseUrl()}${photo.url}`} 
                          alt={product.name}
                          className="photo-preview"
                        />
                        <button
                          type="button"
                          className="photo-delete-btn"
                          onClick={() => handleDeletePhoto(photo.id, photo.url)}
                          title="Remove photo"
                        >
                          <Icon name="x" size={16} color="white" />
                        </button>
                        <div className="photo-info">
                          <span className="photo-date">
                            {new Date(photo.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="photo-empty">
                    <Icon name="image" size={48} color="#cbd5e1" />
                    <p>No photos uploaded yet</p>
                  </div>
                )}
              </>
            ) : (
              <div className="photo-save-first">
                <Icon name="info" size={24} color="#3b82f6" />
                <p>Please save the product first before uploading photos</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              icon="x"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              icon="check"
            >
              {product ? 'Update Product' : 'Add Product'}
            </Button>
          </div>
        </form>

        {/* Photo Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirm !== null}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDeletePhoto}
          title="Delete Photo?"
          message="Are you sure you want to delete this photo? This action cannot be undone."
          confirmText="Delete Photo"
          cancelText="Cancel"
          variant="danger"
        />
      </Modal>
    </div>
  );
}
