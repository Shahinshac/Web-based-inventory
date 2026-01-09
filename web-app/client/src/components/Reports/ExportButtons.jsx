import React from 'react';
import Button from '../Common/Button';

export default function ExportButtons({ reportData, onExportCSV, onExportPDF }) {
  return (
    <div className="export-buttons">
      <h3>Export Report</h3>
      <div className="export-actions">
        <Button
          variant="secondary"
          onClick={() => onExportCSV && onExportCSV(reportData)}
          icon="file"
        >
          Export as CSV
        </Button>
        
        <Button
          variant="primary"
          onClick={() => onExportPDF && onExportPDF(reportData)}
          icon="file-text"
        >
          Export as PDF
        </Button>
      </div>
    </div>
  );
}
