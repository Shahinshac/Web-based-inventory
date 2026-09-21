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

  const setPreset = (preset) => {
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    if (preset === 'today') {
      setDateRange({ start: endStr, end: endStr });
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateRange({ start: firstDay.toISOString().split('T')[0], end: endStr });
    } else if (preset === 'last30') {
      const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      setDateRange({ start: past.toISOString().split('T')[0], end: endStr });
    } else if (preset === 'all') {
      setDateRange({ start: '', end: '' });
    }
  };

  const hasActiveDateFilter = Boolean(dateRange.start || dateRange.end);

  return (
    <div className="export-page page-full-width feature-page">
      {/* Page Header */}
      <div className="page-header feature-page-header">
        <div className="page-header-left feature-page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="download" size={22} />
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: '20px' }}>Data Export Center</h1>
              <p className="page-subtitle">
                Export and download business records in CSV format for analysis, auditing, or spreadsheet software
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Controls Bar */}
      <div className="export-date-filter card">
        <div className="export-date-group">
          <Icon name="calendar" size={16} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Date Range Filter:</span>
          <input
            type="date"
            aria-label="Start Date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            placeholder="Start date"
          />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="date"
            aria-label="End Date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            placeholder="End date"
          />
          {hasActiveDateFilter && (
            <button
              type="button"
              className="clear-date-btn"
              onClick={() => setDateRange({ start: '', end: '' })}
            >
              <Icon name="x" size={14} />
              Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
            Presets:
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setPreset('month')}
          >
            This Month
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => setPreset('last30')}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setPreset('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="export-grid">
        {EXPORT_OPTIONS.map(option => {
          const isDateFiltered = ['invoices', 'expenses', 'returns'].includes(option.id) && hasActiveDateFilter;
          return (
            <div key={option.id} className="export-card card">
              <div className="export-card-header">
                <div
                  className="export-card-icon"
                  style={{
                    background: `${option.color}15`,
                    color: option.color,
                    border: `1px solid ${option.color}35`,
                    boxShadow: 'none'
                  }}
                >
                  <Icon name={option.icon} size={22} />
                </div>
                <div className="export-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0 }}>{option.label}</h3>
                    <span className="badge badge-default" style={{ fontSize: '11px', padding: '2px 8px' }}>
                      CSV
                    </span>
                  </div>
                  <p>{option.description}</p>
                </div>
              </div>

              <div className="export-card-meta">
                <Icon name={['invoices', 'expenses', 'returns'].includes(option.id) ? "calendar" : "layers"} size={13} style={{ color: 'var(--text-muted)' }} />
                <span>
                  {isDateFiltered 
                    ? `Filtered: ${dateRange.start || 'Start'} → ${dateRange.end || 'Now'}` 
                    : ['invoices', 'expenses', 'returns'].includes(option.id)
                      ? 'Exports all records (or filtered range)' 
                      : 'Exports all active records'}
                </span>
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
          );
        })}
      </div>

      {/* Info Section */}
      <div className="export-info card">
        <Icon name="info" size={20} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Export Format & Compatibility</strong>
          <p>
            All generated CSV files use standard UTF-8 encoding and can be opened directly in Microsoft Excel,
            Google Sheets, Apple Numbers, or custom accounting systems. Applying a date range above automatically
            filters Invoices, Expenses, and Returns exports to that timeframe.
          </p>
        </div>
      </div>
    </div>
  );
}
