import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('barcode-scanner-container');
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (too verbose)
        }
      );

      setScanning(true);
    } catch (err) {
      console.error('Scanner error:', err);
      setError('Failed to start camera. Please check permissions or enter barcode manually.');
    }
  };

  const stopScanner = async () => {
    if (scanner && scanning) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScan = async (barcode) => {
    await stopScanner();
    onScan(barcode);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      await stopScanner();
      onScan(manualInput.trim());
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h3>
            <Icon name="camera" size={24} />
            Scan Barcode
          </h3>
          <button className="close-btn" onClick={handleClose}>
            <Icon name="x" size={24} />
          </button>
        </div>

        <div className="scanner-body">
          {error ? (
            <div className="scanner-error">
              <Icon name="alert-circle" size={48} color="#ef4444" />
              <p>{error}</p>
            </div>
          ) : (
            <div id="barcode-scanner-container" className="scanner-viewport"></div>
          )}

          <div className="scanner-divider">
            <span>OR</span>
          </div>

          <form className="manual-input-form" onSubmit={handleManualSubmit}>
            <label>Enter Barcode Manually:</label>
            <div className="manual-input-group">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Enter barcode or serial number"
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!manualInput.trim()}
              >
                Submit
              </Button>
            </div>
          </form>
        </div>

        <div className="scanner-footer">
          <p className="scanner-help">
            <Icon name="info" size={16} />
            Position the barcode within the frame or enter it manually
          </p>
        </div>
      </div>
    </div>
  );
}
