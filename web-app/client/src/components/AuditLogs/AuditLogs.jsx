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

      const url = `${getApiUrl()}/api/audit-logs?${params.toString()}`;
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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        background: 'white',
        padding: '20px 24px',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Icon name="shield" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
              Audit Logs
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              Track all system activities and changes
            </p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: loading ? '#e5e7eb' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: loading ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Icon name={loading ? 'loader' : 'refresh-cw'} size={18} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{
          flex: 1,
          minWidth: '250px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <Icon name="search" size={18} style={{ color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by action, user, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <Icon name="x" size={16} style={{ color: '#9ca3af' }} />
            </button>
          )}
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            padding: '12px 16px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '180px'
          }}
        >
          {ACTIONS.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total Logs', value: total, color: '#8b5cf6' },
          { label: 'Shown', value: filteredLogs.length, color: '#3b82f6' },
          { label: 'Page', value: `${page} / ${totalPages || 1}`, color: '#22c55e' }
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          marginBottom: '24px',
          color: '#dc2626'
        }}>
          <Icon name="alert-circle" size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <button 
            onClick={fetchLogs}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Logs List */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
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
