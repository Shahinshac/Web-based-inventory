import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { getAuthHeaders } from '../../utils/api';

// API base URL
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return baseUrl.replace(/\/$/, '');
};

// Format date/time in IST
const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  } catch {
    return 'Invalid date';
  }
};

// Action filters
const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'PRODUCT_ADDED', label: 'Product Added' },
  { value: 'PRODUCT_UPDATED', label: 'Product Updated' },
  { value: 'PRODUCT_DELETED', label: 'Product Deleted' },
  { value: 'PRODUCT_STOCK_UPDATED', label: 'Stock Updated' },
  { value: 'SALE_COMPLETED', label: 'Sale Completed' },
  { value: 'CUSTOMER_ADDED', label: 'Customer Added' },
  { value: 'CUSTOMER_UPDATED', label: 'Customer Updated' },
  { value: 'CUSTOMER_DELETED', label: 'Customer Deleted' },
  { value: 'USER_LOGIN', label: 'User Login' },
  { value: 'USER_LOGOUT', label: 'User Logout' },
  { value: 'USER_PASSWORD_CHANGED', label: 'Password Changed' },
  { value: 'EXPENSE_ADDED', label: 'Expense Added' },
  { value: 'EXPENSE_DELETED', label: 'Expense Deleted' },
];

// Get icon for action type
const getIcon = (action) => {
  if (!action) return 'activity';
  if (action.includes('PRODUCT') || action.includes('STOCK')) return 'package';
  if (action.includes('SALE') || action.includes('INVOICE')) return 'shopping-cart';
  if (action.includes('CUSTOMER')) return 'users';
  if (action.includes('EXPENSE')) return 'credit-card';
  if (action.includes('USER') || action.includes('LOGIN') || action.includes('LOGOUT')) return 'user';
  if (action.includes('ADMIN') || action.includes('PASSWORD')) return 'shield';
  return 'activity';
};

// Get color for action type
const getColor = (action) => {
  if (!action) return '#6b7280';
  if (action.includes('DELETED') || action.includes('CLEAR')) return '#ef4444';
  if (action.includes('ADDED') || action.includes('COMPLETED') || action.includes('CREATED')) return '#22c55e';
  if (action.includes('UPDATED') || action.includes('APPROVED') || action.includes('CHANGED')) return '#3b82f6';
  if (action.includes('LOGIN')) return '#8b5cf6';
  if (action.includes('LOGOUT')) return '#f59e0b';
  return '#6b7280';
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // Fetch audit logs
  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('skip', ((page - 1) * pageSize).toString());
      
      if (actionFilter) {
        params.append('action', actionFilter);
      }

      const url = `${getApiUrl()}/api/admin/audit-logs?${params.toString()}`;
      console.log('Fetching audit logs:', url);
      
      const response = await fetch(url, { headers: getAuthHeaders() });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Audit logs response:', data);
      
      // Handle both formats: array or { logs, total }
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
      } else {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [actionFilter]);

  // Filter logs by search
  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    const details = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.username || '').toLowerCase().includes(q) ||
      details.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  // Format details object
  const formatDetails = (details) => {
    if (!details) return null;
    if (typeof details === 'string') return details;
    return Object.entries(details)
      .filter(([_, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' • ');
  };

  return (
    <div className="audit-logs-page page-full-width">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="shield" size={22} style={{ color: 'var(--primary)' }} />
            System Audit & Security Logs
          </h1>
          <p className="page-subtitle">
            Comprehensive immutable audit trail of user access, product alterations, inventory changes, and transactions
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-secondary"
          >
            <Icon name={loading ? 'loader' : 'refresh-cw'} size={15} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="table-toolbar card" style={{ marginBottom: '20px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Icon 
            name="search" 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }} 
          />
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, username, IP, or details..."
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', width: '100%' }}
          />
        </div>

        {/* Action Filter */}
        <div style={{ minWidth: '200px' }}>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-select"
            style={{ width: '100%', height: '38px', fontSize: '13px' }}
          >
            {ACTIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-primary">
            <Icon name="activity" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Total Audit Events</div>
            <div className="kpi-value tabular">{total}</div>
            <div className="kpi-sub">
              <span className="badge badge-default">Logged in Database</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-info">
            <Icon name="layers" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Filtered Results</div>
            <div className="kpi-value tabular">{filteredLogs.length}</div>
            <div className="kpi-sub">
              <span className="badge badge-primary">Active Search Query</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-success">
            <Icon name="file-text" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Current Page</div>
            <div className="kpi-value tabular">{page} / {totalPages || 1}</div>
            <div className="kpi-sub">
              <span className="badge badge-success">50 entries per page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{
          background: 'var(--danger-light)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          marginBottom: '20px',
          color: 'var(--danger-text)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Icon name="alert-circle" size={20} />
          <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
          <button 
            type="button"
            onClick={fetchLogs}
            className="btn btn-danger btn-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Logs List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#6b7280', margin: 0 }}>Loading audit logs...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Icon name="inbox" size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: '#374151' }}>No Audit Logs Found</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              {search || actionFilter ? 'Try adjusting your filters' : 'No activity has been recorded yet'}
            </p>
          </div>
        ) : (
          <div style={{ padding: '8px' }}>
            {filteredLogs.map((log, idx) => (
              <div
                key={log.id || log._id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: idx % 2 === 0 ? '#f9fafb' : 'white',
                  marginBottom: '4px'
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${getColor(log.action)}15`,
                  color: getColor(log.action),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon name={getIcon(log.action)} size={18} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: `${getColor(log.action)}15`,
                        color: getColor(log.action),
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginBottom: '6px'
                      }}>
                        {(log.action || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <Icon name="user" size={14} />
                        <span>{log.username || 'System'}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p style={{
                      margin: '8px 0 0',
                      padding: '10px 12px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#4b5563',
                      lineHeight: 1.5
                    }}>
                      {formatDetails(log.details)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                background: page === 1 ? '#f3f4f6' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1
              }}
            >
              <Icon name="chevrons-left" size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                background: page === 1 ? '#f3f4f6' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1
              }}
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <span style={{ padding: '8px 16px', fontSize: '14px', color: '#374151' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 12px',
                background: page === totalPages ? '#f3f4f6' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1
              }}
            >
              <Icon name="chevron-right" size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              style={{
                padding: '8px 12px',
                background: page === totalPages ? '#f3f4f6' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1
              }}
            >
              <Icon name="chevrons-right" size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
