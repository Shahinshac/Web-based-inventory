import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Button from '../Common/Button';

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
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal 
      isOpen={true}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add New Product'}
    >
      <form onSubmit={handleSubmit} className="product-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px' }}>
        <Input
          label="Product Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter product name"
          required
          error={errors.name}
          style={{ fontSize: '15px', padding: '12px 16px' }}
        />

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input
            label="Price (₹)"
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

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Input
            label="Quantity"
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
            label="Min Stock Level"
            type="number"
            value={formData.minStock}
            onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
            placeholder="10"
            min="0"
            error={errors.minStock}
            style={{ fontSize: '15px', padding: '12px 16px' }}
          />
        </div>

        <Input
          label="Category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          placeholder="Electronics, Accessories, etc."
          style={{ fontSize: '15px', padding: '12px 16px' }}
        />

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

        <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
          <Button type="button" variant="secondary" onClick={onClose} style={{ padding: '12px 28px', fontSize: '15px' }}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
            {product ? 'Update Product' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
