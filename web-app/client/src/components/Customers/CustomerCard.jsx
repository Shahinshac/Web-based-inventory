import React, { useState } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import { generateCustomerWhatsAppShare } from '../../services/customerService';

export default function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onViewHistory
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleWhatsAppShare = async () => {
    setIsSharing(true);
    try {
      const response = await generateCustomerWhatsAppShare(customer.id);

      if (response.whatsappUrl) {
        window.open(response.whatsappUrl, '_blank');
      } else {
        alert(`Customer card link generated:\n${response.publicUrl}\n\nNote: No phone number found for this customer.`);
      }
    } catch (error) {
      alert('Failed to generate customer card link. Please try again.');
      console.error('WhatsApp share error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="customer-card">
        <div className="customer-card-header">
          <div className="customer-avatar">
            <Icon name="user" size={32} />
          </div>
          <div className="customer-info">
            <h3 className="customer-name">{customer.name}</h3>
            {customer.position && (
              <span className="customer-position">{customer.position}</span>
            )}
            {customer.company && (
              <span className="customer-company">
                <Icon name="briefcase" size={14} />
                {customer.company}
              </span>
            )}
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

          {customer.email && (
            <div className="customer-detail">
              <Icon name="mail" size={16} />
              <span>{customer.email}</span>
            </div>
          )}

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

        <div className="customer-card-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
          <Button
            variant="success"
            size="small"
            onClick={handleWhatsAppShare}
            disabled={isSharing}
            icon="share-2"
            style={{ background: '#10b981', color: 'white', border: 'none', fontWeight: 600 }}
          >
            {isSharing ? 'Sharing...' : 'Share'}
          </Button>

          {onViewHistory && (
            <Button
              variant="primary"
              size="small"
              onClick={() => onViewHistory(customer)}
              icon="file-text"
              style={{ background: '#3b82f6', color: 'white', border: 'none', fontWeight: 600 }}
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
              style={{ background: '#64748b', color: 'white', border: 'none', fontWeight: 600 }}
            >
              Edit
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="danger"
              size="small"
              onClick={onDelete}
              icon="trash-2"
              style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 600 }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
