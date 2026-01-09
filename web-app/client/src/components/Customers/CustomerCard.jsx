import React, { useState } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';

export default function CustomerCard({ 
  customer, 
  onEdit, 
  onDelete,
  onViewHistory
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="customer-card">
        <div className="customer-card-header">
          <div className="customer-avatar">
            <Icon name="user" size={32} />
          </div>
          <div className="customer-info">
            <h3 className="customer-name">{customer.name}</h3>
            {customer.gstin && (
              <span className="customer-gstin">
                <Icon name="award" size={14} />
                GST: {customer.gstin}
              </span>
            )}
          </div>
        </div>

        <div className="customer-card-body">
          <div className="customer-detail">
            <Icon name="phone" size={16} />
            <span>{customer.phone || 'No phone'}</span>
          </div>

          {customer.place && (
            <div className="customer-detail">
              <Icon name="map-pin" size={16} />
              <span>{customer.place}{customer.pincode ? ` - ${customer.pincode}` : ''}</span>
            </div>
          )}

          {customer.address && (
            <div className="customer-detail">
              <Icon name="home" size={16} />
              <span>{customer.address}</span>
            </div>
          )}
        </div>

        <div className="customer-card-actions">
          {onViewHistory && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => onViewHistory(customer)}
              icon="file-text"
            >
              History
            </Button>
          )}
          
          {onEdit && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => onEdit(customer)}
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
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(customer.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customer.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
