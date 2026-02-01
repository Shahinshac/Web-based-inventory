import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Button from '../Common/Button';
import Icon from '../../Icon';
import './CustomerForm.css';

export default function CustomerForm({ customer, onSubmit, onClose, quickAdd = false }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    place: '',
    pincode: '',
    gstin: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        place: customer.place || '',
        pincode: customer.pincode || '',
        gstin: customer.gstin || ''
      });
    }
  }, [customer]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    if (formData.gstin && formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters';
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

  return (
    <div className="customer-form-modal">
      <Modal 
        isOpen={true}
        onClose={onClose}
        title={customer ? '✏️ Edit Customer' : quickAdd ? '⚡ Quick Add Customer' : '👤 Add New Customer'}
        size={quickAdd ? "md" : "xl"}
      >
        <form onSubmit={handleSubmit} className="customer-form">
          
          {/* Section 1: Contact Information */}
          <div className="form-section contact">
            <div className="form-section-bar" />
            <div className="form-section-header">
              <div className="form-section-icon">
                <Icon name="user" size={20} color="white" />
              </div>
              <h3 className="form-section-title">Contact Information</h3>
              {quickAdd && <span className="quick-add-badge">Quick Add</span>}
            </div>
            
            <Input
              label="Customer Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter customer name"
              required
              error={errors.name}
            />

            <div className="input-spacer">
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="10-digit phone number"
                required
                error={errors.phone}
              />
            </div>
          </div>

          {/* Show full form only if not quick add */}
          {!quickAdd && (
            <>
              {/* Section 2: Address Details */}
              <div className="form-section address">
                <div className="form-section-bar" />
                <div className="form-section-header">
                  <div className="form-section-icon">
                    <Icon name="map-pin" size={20} color="white" />
                  </div>
                  <h3 className="form-section-title">Address Details</h3>
                </div>
                
                <Input
                  label="Street Address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Enter street address"
                />

                <div className="form-row">
                  <Input
                    label="Place/City"
                    value={formData.place}
                    onChange={(e) => handleChange('place', e.target.value)}
                    placeholder="City name"
                  />

                  <Input
                    label="Pincode"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    placeholder="6-digit pincode"
                    maxLength="6"
                    error={errors.pincode}
                  />
                </div>
              </div>

              {/* Section 3: Business Information */}
              <div className="form-section business">
                <div className="form-section-bar" />
                <div className="form-section-header">
                  <div className="form-section-icon">
                    <Icon name="briefcase" size={20} color="white" />
                  </div>
                  <h3 className="form-section-title">Business Information</h3>
                </div>
                
                <Input
                  label="GSTIN"
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN (optional)"
                  maxLength="15"
                  error={errors.gstin}
                  helperText="Goods and Services Tax Identification Number"
                />
              </div>
            </>
          )}

          {quickAdd && (
            <div className="quick-add-note">
              <Icon name="info" size={14} />
              <span>Complete customer details can be added later from the Customers section</span>
            </div>
          )}

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
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
