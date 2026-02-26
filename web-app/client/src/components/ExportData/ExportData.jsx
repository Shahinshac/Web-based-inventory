import React, { useState } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { API, getAuthHeaders } from '../../utils/api';

const EXPORT_OPTIONS = [
  { 
    id: 'products', 
    label: 'Products', 
    icon: 'package', 
    description: 'Export all products with pricing, stock levels, and categories',
    color: '#6366f1',
    endpoint: '/api/exports/products',
    filename: 'products_export.csv'
  },
  { 
    id: 'customers', 
    label: 'Customers', 
    icon: 'users', 
    description: 'Export customer list with contact details and purchase history',
    color: '#10b981',
    endpoint: '/api/exports/customers',
    filename: 'customers_export.csv'
  },
  { 
    id: 'invoices', 
    label: 'Invoices', 
    icon: 'file-text', 
    description: 'Export all invoices with item details, totals, and payment info',
    color: '#f59e0b',
    endpoint: '/api/exports/invoices',
    filename: 'invoices_export.csv'
  },
  { 
    id: 'expenses', 
    label: 'Expenses', 
    icon: 'credit-card', 
    description: 'Export all expense records with categories and amounts',
    color: '#ef4444',
    endpoint: '/api/exports/expenses',
    filename: 'expenses_export.csv'
  },
  { 
    id: 'returns', 
    label: 'Returns', 
    icon: 'rotate-ccw', 
    description: 'Export product return records and refund details',
    color: '#8b5cf6',
    endpoint: '/api/exports/returns',
    filename: 'returns_export.csv'
  }
];

export default function ExportData({ showNotification }) {
  const [exporting, setExporting] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const handleExport = async (option) => {
    setExporting(option.id);
    try {
      let url = API(option.endpoint);
      const params = new URLSearchParams();
      if (dateRange.start) params.set('startDate', dateRange.start);
      if (dateRange.end) params.set('endDate', dateRange.end);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url, { headers: getAuthHeaders() });
      
      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = option.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showNotification?.(`${option.label} exported successfully!`, 'success');
    } catch (error) {
      showNotification?.(`Failed to export ${option.label.toLowerCase()}`, 'error');
      console.error('Export error:', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="feature-page export-page">
      <div className="feature-page-header">
        <div className="feature-page-title">
          <Icon name="download" size={24} />
          <div>
            <h2>Export Data</h2>
            <p className="feature-page-subtitle">Download your business data as CSV files</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="export-date-filter">
        <div className="export-date-group">
          <Icon name="calendar" size={16} />
          <span>Date Range (optional):</span>
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            placeholder="Start date"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            placeholder="End date"
          />
          {(dateRange.start || dateRange.end) && (
            <button
              className="clear-date-btn"
              onClick={() => setDateRange({ start: '', end: '' })}
            >
              <Icon name="x" size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Export Cards */}
      <div className="export-grid">
        {EXPORT_OPTIONS.map(option => (
          <div key={option.id} className="export-card">
            <div className="export-card-icon" style={{ background: `linear-gradient(135deg, ${option.color}, ${option.color}dd)` }}>
              <Icon name={option.icon} size={28} />
            </div>
            <div className="export-card-content">
              <h3>{option.label}</h3>
              <p>{option.description}</p>
            </div>
            <Button
              variant="primary"
              icon="download"
              onClick={() => handleExport(option)}
              disabled={exporting === option.id}
            >
              {exporting === option.id ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="export-info">
        <Icon name="info" size={18} />
        <div>
          <strong>Export Tips</strong>
          <p>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application. 
             Use the date range filter to export data for a specific period (applies to invoices, expenses, and returns).</p>
        </div>
      </div>
    </div>
  );
}
