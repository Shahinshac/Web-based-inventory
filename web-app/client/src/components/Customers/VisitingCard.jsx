import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../Icon';
import ConfirmDialog from '../Common/ConfirmDialog';
import './VisitingCard.css';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function buildVCard(customer) {
  const parts = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${customer.name || ''}`,
    customer.phone ? `TEL;TYPE=CELL:${customer.phone}` : '',
    customer.email ? `EMAIL:${customer.email}` : '',
    customer.company ? `ORG:${customer.company}` : '',
    customer.position ? `TITLE:${customer.position}` : '',
    customer.website ? `URL:${customer.website}` : '',
    (customer.address || customer.place || customer.city)
      ? `ADR:;;${customer.address || ''};${customer.place || customer.city || ''};${customer.pincode || ''};;${customer.country || ''}`
      : '',
    'END:VCARD'
  ];
  return parts.filter(Boolean).join('\n');
}

export default function VisitingCard({
  customer,
  onEdit,
  onDelete,
  onViewHistory
}) {
  const [flipped, setFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const canvasRef = useRef(null);

  // Generate QR code when card is flipped for the first time
  useEffect(() => {
    if (flipped && !qrDataUrl && !qrError) {
      const vCardData = buildVCard(customer);
      import('qrcode').then(mod => {
        const QRCode = mod.default;
        QRCode.toDataURL(vCardData, {
          width: 200,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#1e293b', light: '#ffffff' }
        }).then(url => {
          setQrDataUrl(url);
        }).catch(() => {
          setQrError(true);
        });
      }).catch(() => {
        setQrError(true);
      });
    }
  }, [flipped, customer, qrDataUrl, qrError]);

  const initials = getInitials(customer.name);
  const displayCompany = customer.company || '';
  const displayPosition = customer.position || '';
  const displayCity = customer.city || customer.place || '';
  const displayCountry = customer.country || '';
  const location = [displayCity, displayCountry].filter(Boolean).join(', ');

  return (
    <>
      <div className="visiting-card-container">
        <div
          className={`visiting-card-scene${flipped ? ' flipped' : ''}`}
          onClick={() => setFlipped(f => !f)}
          title="Click to flip card"
          role="button"
          aria-pressed={flipped}
          aria-label={`${customer.name} visiting card – click to ${flipped ? 'show front' : 'show QR code'}`}
        >
          <div className="visiting-card-inner">
            {/* FRONT */}
            <div className="visiting-card-front">
              <div className="vc-header">
                <div className="vc-header-pattern" />
                <div className="vc-avatar">
                  {customer.image_url
                    ? <img src={customer.image_url} alt={customer.name} />
                    : initials
                  }
                </div>
                {displayCompany && (
                  <div className="vc-company-logo">{displayCompany}</div>
                )}
              </div>

              <div className="vc-body">
                <div>
                  <p className="vc-name">{customer.name}</p>
                  {displayPosition && <p className="vc-position">{displayPosition}</p>}
                  {displayCompany && <p className="vc-company">{displayCompany}</p>}
                </div>

                <div className="vc-divider" />

                <div className="vc-contacts">
                  {customer.phone && (
                    <a
                      className="vc-contact-item"
                      href={`tel:${customer.phone}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <Icon name="phone" size={12} className="vc-contact-icon" />
                      {customer.phone}
                    </a>
                  )}
                  {customer.email && (
                    <a
                      className="vc-contact-item"
                      href={`mailto:${customer.email}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <Icon name="mail" size={12} className="vc-contact-icon" />
                      {customer.email}
                    </a>
                  )}
                  {location && (
                    <span className="vc-contact-item">
                      <Icon name="map-pin" size={12} className="vc-contact-icon" />
                      {location}
                    </span>
                  )}
                  {customer.website && (
                    <a
                      className="vc-contact-item"
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                    >
                      <Icon name="globe" size={12} className="vc-contact-icon" />
                      {customer.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              <div className="vc-footer">
                <span className="vc-flip-hint">
                  <Icon name="refresh-cw" size={10} />
                  Flip for QR
                </span>
                {customer.gstin && (
                  <span className="vc-gstin-badge">GST: {customer.gstin}</span>
                )}
              </div>
            </div>

            {/* BACK */}
            <div className="visiting-card-back">
              <div className="vc-back-pattern" />
              <div className="vc-qr-wrapper">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="vCard QR Code" width={100} height={100} />
                  : qrError
                    ? <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 11, textAlign: 'center' }}>QR unavailable</div>
                    : <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>Loading…</div>
                }
              </div>
              <p className="vc-back-name">{customer.name}</p>
              <p className="vc-scan-hint">
                <Icon name="smartphone" size={10} />
                Scan to save contact
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="vc-actions">
          {onViewHistory && (
            <button className="vc-action-btn history" onClick={() => onViewHistory(customer)}>
              <Icon name="file-text" size={12} />
              History
            </button>
          )}
          {onEdit && (
            <button className="vc-action-btn edit" onClick={() => onEdit(customer)}>
              <Icon name="edit" size={12} />
              Edit
            </button>
          )}
          {onDelete && (
            <button className="vc-action-btn delete" onClick={() => setShowDeleteConfirm(true)}>
              <Icon name="trash-2" size={12} />
              Delete
            </button>
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
