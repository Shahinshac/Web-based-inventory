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
    if (formData.quantity === 0) return { text: 'Out of Stock', color: '#ef4444', icon: '🔴' };
    if (formData.quantity < formData.minStock) return { text: 'Low Stock', color: '#f59e0b', icon: '🟡' };
    return { text: 'In Stock', color: '#10b981', icon: '🟢' };
  };

  const stockStatus = getStockStatus();

  // Section styles
  const sectionStyle = {
    padding: '24px 20px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    position: 'relative',
    transition: 'all 0.2s ease'
  };

  const sectionHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0'
  };

  const iconWrapperStyle = (bgGradient) => ({
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: bgGradient,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  });

  return (
    <div className="product-form-modal">
      <Modal 
        isOpen={true}
        onClose={onClose}
        title={product ? '✏️ Edit Product' : '✨ Add New Product'}
        size="large"
        noInternalScroll={true}
      >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '4px' }}>
        
        {/* Section 1: Basic Information */}
        <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', borderRadius: '12px 12px 0 0' }} />
          <div style={sectionHeaderStyle}>
            <div style={iconWrapperStyle('linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)')}>
              <Icon name="package" size={20} color="white" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Basic Information</span>
          </div>
          
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter product name"
            required
            error={errors.name}
            style={{ fontSize: '15px', padding: '12px 16px' }}
          />
          
          <div style={{ marginTop: '20px' }}>
            <Input
              label="Category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Electronics, Accessories, etc."
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
          </div>
        </div>

        {/* Section 2: Pricing & Profit */}
        <div style={{ ...sectionStyle, background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)', borderRadius: '12px 12px 0 0' }} />
          <div style={sectionHeaderStyle}>
            <div style={iconWrapperStyle('linear-gradient(135deg, #10b981 0%, #34d399 100%)')}>
              <Icon name="rupee" size={20} color="white" />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Pricing & Profit</span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />

            <Input
              label="Cost Price (₹)"
              type="number"
              value={formData.costPrice}
              onChange={(e) => handleChange('costPrice', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
          </div>

          {formData.price > 0 && formData.costPrice > 0 && (
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              background: profit >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '8px',
              border: `2px solid ${profit >= 0 ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Input
              label="Current Quantity"
              type="number"
              value={formData.quantity}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              required
              error={errors.quantity}
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />

            <Input
              label="Min Stock Alert"
              type="number"
              value={formData.minStock}
              onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
              placeholder="10"
              min="0"
              error={errors.minStock}
              style={{ fontSize: '15px', padding: '12px 16px' }}
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
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <Input
              label="Serial Number"
              value={formData.serialNo}
              onChange={(e) => handleChange('serialNo', e.target.value)}
              placeholder="Optional"
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />

            <Input
              label="Barcode"
              value={formData.barcode}
              onChange={(e) => handleChange('barcode', e.target.value)}
              placeholder="Optional"
              style={{ fontSize: '15px', padding: '12px 16px' }}
            />
          </div>

          <Input
            label="HSN Code"
            value={formData.hsnCode}
            onChange={(e) => handleChange('hsnCode', e.target.value)}
            placeholder="9999"
            helperText="Harmonized System of Nomenclature code for GST"
            style={{ fontSize: '15px', padding: '12px 16px' }}
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
