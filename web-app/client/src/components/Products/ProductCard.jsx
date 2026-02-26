import React, { useState, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import Icon from '../../Icon';
import Button from '../Common/Button';
import ConfirmDialog from '../Common/ConfirmDialog';
import { formatCurrency } from '../../constants';

export default function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  canViewProfit 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [barcodeCanvas, setBarcodeCanvas] = useState(null);
  const [qrCanvas, setQRCanvas] = useState(null);

  const profit = product.price - (product.costPrice || 0);
  const profitMargin = product.price > 0 ? ((profit / product.price) * 100).toFixed(1) : 0;

  const stockStatus = product.quantity === 0 
    ? 'out-of-stock' 
    : product.quantity < product.minStock 
    ? 'low-stock' 
    : 'in-stock';

  // Generate and download barcode
  const downloadBarcode = useCallback(() => {
    const barcodeValue = product.barcode || product.serialNo || `PROD-${product.id}`;
    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000',
        text: `${product.name}\n${barcodeValue}`
      });
      
      const link = document.createElement('a');
      link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-barcode.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating barcode:', err);
      alert('Failed to generate barcode. Please try again.');
    }
  }, [product]);

  // Show barcode in modal
  const showBarcode = useCallback(() => {
    const barcodeValue = product.barcode || product.serialNo || `PROD-${product.id}`;
    const canvas = document.createElement('canvas');
    
    try {
      JsBarcode(canvas, barcodeValue, {
        format: 'CODE128',
        width: 3,
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10,
        background: '#ffffff',
        lineColor: '#000000'
      });
      
      setBarcodeCanvas(canvas);
      setShowBarcodeModal(true);
    } catch (err) {
      console.error('Error generating barcode:', err);
      alert('Failed to generate barcode. Please try again.');
    }
  }, [product]);

  // Download from modal canvas
  const downloadBarcodeFromModal = useCallback(() => {
    if (!barcodeCanvas) return;
    
    const link = document.createElement('a');
    link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-barcode.png`;
    link.href = barcodeCanvas.toDataURL('image/png');
    link.click();
  }, [barcodeCanvas, product.name]);

  // Generate and download QR code
  const downloadQRCode = useCallback(async () => {
    const qrData = JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      barcode: product.barcode || '',
      serialNo: product.serialNo || ''
    });
    
    try {
      // Using QRCode library via dynamic import or canvas API
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      
      await QRCode.toCanvas(canvas, qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      // Add product name below QR code
      const ctx = canvas.getContext('2d');
      const originalHeight = canvas.height;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = originalHeight + 40;
      const newCtx = newCanvas.getContext('2d');
      
      newCtx.fillStyle = '#ffffff';
      newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      newCtx.drawImage(canvas, 0, 0);
      
      newCtx.fillStyle = '#000000';
      newCtx.font = 'bold 14px Arial';
      newCtx.textAlign = 'center';
      newCtx.fillText(product.name, newCanvas.width / 2, originalHeight + 25);
      
      const link = document.createElement('a');
      link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-qrcode.png`;
      link.href = newCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code. Please try again.');
    }
  }, [product]);

  // Show QR code in modal
  const showQRCode = useCallback(async () => {
    const qrData = JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      barcode: product.barcode || '',
      serialNo: product.serialNo || ''
    });
    
    try {
      const QRCode = (await import('qrcode')).default;
      const canvas = document.createElement('canvas');
      
      await QRCode.toCanvas(canvas, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQRCanvas(canvas);
      setShowQRModal(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code. Please try again.');
    }
  }, [product]);

  // Download QR from modal
  const downloadQRFromModal = useCallback(() => {
    if (!qrCanvas) return;
    
    // Add product name below QR code
    const originalHeight = qrCanvas.height;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = qrCanvas.width;
    newCanvas.height = originalHeight + 40;
    const ctx = newCanvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    ctx.drawImage(qrCanvas, 0, 0);
    
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(product.name, newCanvas.width / 2, originalHeight + 25);
    
    const link = document.createElement('a');
    link.download = `${product.name.replace(/[^a-z0-9]/gi, '_')}-qrcode.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
  }, [qrCanvas, product.name]);

  return (
    <>
      <div className={`product-card ${stockStatus}`}>
        <div className="product-card-image">
          <div className="product-placeholder">
            <Icon name="package" size={48} color="#cbd5e1" />
          </div>
          <div className={`stock-badge ${stockStatus}`}>
            {product.quantity === 0 ? (
              <>
                <Icon name="x-circle" size={14} />
                Out of Stock
              </>
            ) : product.quantity < product.minStock ? (
              <>
                <Icon name="alert-triangle" size={14} />
                Low Stock
              </>
            ) : (
              <>
                <Icon name="check-circle" size={14} />
                In Stock
              </>
            )}
          </div>
        </div>

        <div className="product-card-body">
          <h3 className="product-card-title">{product.name}</h3>
          
          <div className="product-card-info">
            <div className="info-row">
              <span className="info-label">Price:</span>
              <span className="info-value">{formatCurrency(product.price)}</span>
            </div>
            
            {canViewProfit && (
              <div className="info-row">
                <span className="info-label">Profit:</span>
                <span className="info-value profit">
                  {formatCurrency(profit)} ({profitMargin}%)
                </span>
              </div>
            )}
            
            <div className="info-row">
              <span className="info-label">Stock:</span>
              <span className={`info-value stock-${stockStatus}`}>
                {product.quantity} units
              </span>
            </div>

            {product.serialNo && (
              <div className="info-row">
                <span className="info-label">Serial:</span>
                <span className="info-value">{product.serialNo}</span>
              </div>
            )}
          </div>

          <div className="product-card-actions">
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowDetails(!showDetails)}
              icon={showDetails ? 'chevron-up' : 'chevron-down'}
            >
              {showDetails ? 'Less' : 'More'}
            </Button>
            
            {onEdit && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => onEdit(product)}
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

          {showDetails && (
            <div className="product-details">
              <div className="detail-row">
                <span>Min Stock:</span>
                <span>{product.minStock}</span>
              </div>
              <div className="detail-row">
                <span>HSN Code:</span>
                <span>{product.hsnCode || 'N/A'}</span>
              </div>
              {product.barcode && (
                <div className="detail-row">
                  <span>Barcode:</span>
                  <span>{product.barcode}</span>
                </div>
              )}
              {canViewProfit && product.costPrice && (
                <div className="detail-row">
                  <span>Cost Price:</span>
                  <span>{formatCurrency(product.costPrice)}</span>
                </div>
              )}
              
              {/* Barcode & QR Code Section */}
              <div className="barcode-qr-section">
                <div className="barcode-qr-header">
                  <Icon name="barcode" size={16} />
                  <span>Product Codes</span>
                </div>
                <div className="barcode-qr-actions">
                  <div className="code-action-group">
                    <button 
                      className="barcode-view-btn"
                      onClick={showBarcode}
                      title="View Barcode"
                    >
                      <Icon name="barcode" size={18} />
                      <span>View Barcode</span>
                      <Icon name="eye" size={14} />
                    </button>
                    <button 
                      className="barcode-download-btn"
                      onClick={downloadBarcode}
                      title="Download Barcode"
                    >
                      <Icon name="download" size={16} />
                    </button>
                  </div>
                  <div className="code-action-group">
                    <button 
                      className="qrcode-view-btn"
                      onClick={showQRCode}
                      title="View QR Code"
                    >
                      <Icon name="qr-code" size={18} />
                      <span>View QR Code</span>
                      <Icon name="eye" size={14} />
                    </button>
                    <button 
                      className="qrcode-download-btn"
                      onClick={downloadQRCode}
                      title="Download QR Code"
                    >
                      <Icon name="download" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(product.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Barcode Preview Modal */}
      {showBarcodeModal && (
        <div className="code-modal-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="code-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="code-modal-header">
              <h3>
                <Icon name="barcode" size={20} />
                Barcode Preview
              </h3>
              <button 
                className="code-modal-close"
                onClick={() => setShowBarcodeModal(false)}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="code-modal-body">
              <div className="code-product-name">{product.name}</div>
              <div className="code-value">{product.barcode || product.serialNo || `PROD-${product.id}`}</div>
              {barcodeCanvas && (
                <div className="code-preview">
                  <img src={barcodeCanvas.toDataURL()} alt="Barcode" />
                </div>
              )}
            </div>
            <div className="code-modal-footer">
              <Button
                variant="secondary"
                onClick={() => setShowBarcodeModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={downloadBarcodeFromModal}
                icon="download"
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Preview Modal */}
      {showQRModal && (
        <div className="code-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="code-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="code-modal-header">
              <h3>
                <Icon name="qr-code" size={20} />
                QR Code Preview
              </h3>
              <button 
                className="code-modal-close"
                onClick={() => setShowQRModal(false)}
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="code-modal-body">
              <div className="code-product-name">{product.name}</div>
              {qrCanvas && (
                <div className="code-preview">
                  <img src={qrCanvas.toDataURL()} alt="QR Code" />
                </div>
              )}
              <div className="code-info">
                Scan to view product details
              </div>
            </div>
            <div className="code-modal-footer">
              <Button
                variant="secondary"
                onClick={() => setShowQRModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={downloadQRFromModal}
                icon="download"
              >
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
