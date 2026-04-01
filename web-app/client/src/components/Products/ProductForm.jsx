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
    companyProfit: 0,
    gstPercent: 18,
    hsnCode: '9999',
    minStock: 10,
    serialNo: '',
    barcode: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        quantity: product.quantity || 0,
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        companyProfit: (product.price / (1 + (product.gstPercent || 18) / 100)) - (product.costPrice || 0),
        gstPercent: product.gstPercent !== undefined ? product.gstPercent : 18,
        hsnCode: product.hsnCode || '9999',
        minStock: product.minStock || 10,
        serialNo: product.serialNo || '',
        barcode: product.barcode || ''
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

  // GST Calculations (Selling Price is inclusive of GST)
  const gstRate = parseFloat(formData.gstPercent || 0) / 100;
  const gstFactor = 1 + gstRate;
  
  // Base Price (Exclusive of GST) - Input "Price" includes GST
  const basePrice = formData.price > 0 ? formData.price / gstFactor : 0;
  
  // Detailed GST amount
  const gstAmount = formData.price > 0 ? formData.price - basePrice : 0;

  // Final values for UI consistency
  const profit = formData.companyProfit;
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
                label="Cost Price (₹)"
                type="number"
                value={formData.costPrice || ''}
                onChange={(e) => {
                  const cp = parseFloat(e.target.value) || 0;
                  // If CP changes, we keep current companyProfit and update the Final Price
                  const currentProfit = formData.companyProfit || 0;
                  const currentGstRate = (formData.gstPercent || 0) / 100;
                  const newBase = cp + currentProfit;
                  const newFinal = newBase * (1 + currentGstRate);
                  
                  setFormData(prev => ({
                    ...prev,
                    costPrice: cp,
                    price: Math.round(newFinal * 100) / 100
                  }));
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
              />

              <Input
                label="Company Profit (₹)"
                type="number"
                value={formData.companyProfit || ''}
                onChange={(e) => {
                  const profitVal = parseFloat(e.target.value) || 0;
                  const cp = parseFloat(formData.costPrice) || 0;
                  const currentGstRate = (formData.gstPercent || 0) / 100;
                  const newBase = cp + profitVal;
                  const newFinal = newBase * (1 + currentGstRate);
                  
                  setFormData(prev => ({
                    ...prev,
                    companyProfit: profitVal,
                    price: Math.round(newFinal * 100) / 100
                  }));
                }}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="form-row">
              <Input
                label="GST Rate (%)"
                type="number"
                value={formData.gstPercent || ''}
                onChange={(e) => {
                  const gst = parseFloat(e.target.value) || 0;
                  // If GST changes, we keep CP and Profit constant, update Final Price
                  const cp = parseFloat(formData.costPrice) || 0;
                  const currProfit = formData.companyProfit || 0;
                  const newBase = cp + currProfit;
                  const newFinal = newBase * (1 + (gst / 100));
                  
                  setFormData(prev => ({
                    ...prev,
                    gstPercent: gst,
                    price: Math.round(newFinal * 100) / 100
                  }));
                }}
                placeholder="18"
                min="0"
                max="100"
                step="0.5"
                helperText="0%, 5%, 12%, 18%, or 28%"
              />

              <Input
                label={`Base Price (Excl. GST) (₹)`}
                type="number"
                value={basePrice > 0 ? basePrice.toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                helperText="CP + Profit (Excl. GST)"
              />
            </div>

            <div className="form-row">
              <Input
                label="Final Selling Price (Incl. GST) (₹)"
                type="number"
                value={formData.price || ''}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value) || 0;
                  // If Price changes, we recalculate Profit
                  const currentGstRate = (formData.gstPercent || 0) / 100;
                  const currentCp = parseFloat(formData.costPrice) || 0;
                  const newBase = newPrice / (1 + currentGstRate);
                  const newProfit = newBase - currentCp;

                  setFormData(prev => ({
                    ...prev,
                    price: newPrice,
                    companyProfit: Math.round(newProfit * 100) / 100
                  }));
                }}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                error={errors.price}
                helperText="This price includes GST"
              />
              
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8px 0' }}>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>Customer pays (incl. GST)</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>₹{(formData.price || 0).toFixed(2)}</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Includes ₹{gstAmount.toFixed(2)} GST</span>
              </div>
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
