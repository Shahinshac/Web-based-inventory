import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Button from '../Common/Button';
import Icon from '../../Icon';
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
    category: ''
  });

  const [errors, setErrors] = useState({});

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
        category: product.category || ''
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
            
            <Input
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Electronics, Accessories, etc."
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
      </Modal>
    </div>
  );
}
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="trending-up" size={18} color={profit >= 0 ? '#10b981' : '#ef4444'} />
                <span style={{ color: profit >= 0 ? '#059669' : '#dc2626', fontSize: '15px', fontWeight: '700' }}>
                  {profit >= 0 ? 'Profit' : 'Loss'} per unit:
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: profit >= 0 ? '#059669' : '#dc2626' }}>
                  ₹{Math.abs(profit).toFixed(2)}
                </div>
                <div style={{ fontSize: '13px', color: profit >= 0 ? '#059669' : '#dc2626', marginTop: '2px' }}>
                  ({profitPercentage > 0 ? '+' : ''}{profitPercentage}%)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Inventory Management */}
        <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', borderRadius: '12px 12px 0 0' }} />
          <div style={sectionHeaderStyle}>
            <div style={iconWrapperStyle('linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)')}>
              <Icon name="layers" size={20} color="white" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Inventory Management</span>
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
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: `${stockStatus.color}15`,
              borderRadius: '8px',
              border: `2px solid ${stockStatus.color}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '20px' }}>{stockStatus.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: stockStatus.color }}>
                  {stockStatus.text}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                  {formData.quantity} {formData.quantity === 1 ? 'unit' : 'units'} available
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Product Tracking */}
        <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', borderRadius: '12px 12px 0 0' }} />
          <div style={sectionHeaderStyle}>
            <div style={iconWrapperStyle('linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)')}>
              <Icon name="file-text" size={20} color="white" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Product Tracking</span>
          </div>
          
          <div className="form-row" style={{ marginBottom: '20px' }}>
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

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '3px solid #e2e8f0' }}>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            icon="x"
            style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '600' }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            icon="check"
            style={{ 
              padding: '12px 28px', 
              fontSize: '15px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            {product ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
    </div>
  );
}
