import React from 'react';
import Button from '../Common/Button';

export default function InvoiceActions({ invoice, onExport, onShare }) {
  const handleExport = () => {
    if (onExport) {
      onExport(invoice);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(invoice);
    }
  };

  return (
    <div className="invoice-actions">
      <Button
        variant="secondary"
        size="small"
        onClick={handleExport}
        icon="download"
      >
        PDF
      </Button>

      <Button
        variant="success"
        size="small"
        onClick={handleShare}
        icon="share-2"
      >
        WhatsApp
      </Button>
    </div>
  );
}
