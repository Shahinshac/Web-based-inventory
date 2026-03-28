/**
 * @file WarrantyCard.jsx
 * @description Individual warranty card component
 */

import React from 'react';
import Icon from '../../Icon.jsx';

const WarrantyCard = ({ warranty, onStatusUpdate }) => {
  const daysRemaining = Math.ceil(
    (new Date(warranty.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const getStatusBadge = () => {
    const badges = {
      'active': { label: 'Active', color: 'green' },
      'expiring-soon': { label: 'Expiring Soon', color: 'orange' },
      'expired': { label: 'Expired', color: 'red' },
      'claimed': { label: 'Claimed', color: 'blue' }
    };
    return badges[warranty.status] || badges['active'];
  };

  const badge = getStatusBadge();

  return (
    <div className={`warranty-card status-${warranty.status}`}>
      <div className="warranty-card-header">
        <h3>{warranty.productName}</h3>
        <span className={`badge ${badge.color}`}>{badge.label}</span>
      </div>

      <div className="warranty-card-content">
        <div className="warranty-detail">
          <span className="label">Type</span>
          <span className="value">{warranty.warrantyType || 'Standard'}</span>
        </div>

        <div className="warranty-detail">
          <span className="label">Duration</span>
          <span className="value">{warranty.durationMonths} months</span>
        </div>

        <div className="warranty-detail">
          <span className="label">Purchase Date</span>
          <span className="value">{new Date(warranty.purchaseDate).toLocaleDateString('en-IN')}</span>
        </div>

        <div className="warranty-detail">
          <span className="label">Expiry Date</span>
          <span className="value">{new Date(warranty.expiryDate).toLocaleDateString('en-IN')}</span>
        </div>

        {warranty.serialNumber && (
          <div className="warranty-detail">
            <span className="label">Serial</span>
            <span className="value mono">{warranty.serialNumber}</span>
          </div>
        )}

        {daysRemaining > 0 && (
          <div className="warranty-countdown">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (daysRemaining / (warranty.durationMonths * 30)) * 100))}%`,
                  backgroundColor: badge.color === 'green' ? '#10b981' : badge.color === 'orange' ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <p className="countdown-text">{daysRemaining} days remaining</p>
          </div>
        )}
      </div>

      <div className="warranty-card-actions">
        {warranty.status === 'active' && (
          <button
            className="action-btn renew"
            onClick={() => onStatusUpdate(warranty._id, 'renewal-in-progress')}
          >
            <Icon name="refresh" size={14} />
            Renew
          </button>
        )}
        {warranty.status !== 'claimed' && (
          <button
            className="action-btn claim"
            onClick={() => onStatusUpdate(warranty._id, 'claimed')}
          >
            <Icon name="check" size={14} />
            Claim
          </button>
        )}
      </div>
    </div>
  );
};

export default WarrantyCard;
