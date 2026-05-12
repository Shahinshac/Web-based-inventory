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

    <div className="invoice-actions" style={{ display: 'flex', gap: '8px' }}>
      <Button
        variant="primary"
        size="small"
        onClick={handleExport}
        icon="download"
        style={{ background: '#3b82f6', color: 'white', border: 'none' }}
      >
        PDF
      </Button>
    </div>
}
