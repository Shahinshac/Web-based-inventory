import React, { useState, useEffect } from 'react';
import Modal from '../Common/Modal';
import Input from '../Common/Input';
import Button from '../Common/Button';

export default function CustomerForm({ customer, onSubmit, onClose }) {
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
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Modal 
      isOpen={true}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add New Customer'}
    >
      <form onSubmit={handleSubmit} className="customer-form">
        <Input
          label="Customer Name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter customer name"
          required
          error={errors.name}
        />

        <Input
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="10-digit phone number"
          required
          error={errors.phone}
        />

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Street address"
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

        <Input
          label="GSTIN"
          value={formData.gstin}
          onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
          placeholder="15-character GSTIN (optional)"
          maxLength="15"
          error={errors.gstin}
          helperText="Goods and Services Tax Identification Number"
        />

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {customer ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
