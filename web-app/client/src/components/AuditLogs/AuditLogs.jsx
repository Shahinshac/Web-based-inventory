import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../Icon';
import { API } from '../../utils/api';
import { formatDateTime } from '../../utils/formatters';

// Action type categories for filtering
const ACTION_TYPES = [
  { value: 'all', label: 'All Actions', category: 'all' },
  // Product actions
  { value: 'PRODUCT_ADDED', label: 'Product Added', category: 'product' },
  { value: 'PRODUCT_UPDATED', label: 'Product Updated', category: 'product' },
  { value: 'PRODUCT_DELETED', label: 'Product Deleted', category: 'product' },
  { value: 'PRODUCT_STOCK_UPDATED', label: 'Stock Updated', category: 'product' },
  { value: 'PRODUCT_PHOTO_UPDATED', label: 'Product Photo Updated', category: 'product' },
  { value: 'PRODUCT_PHOTO_DELETED', label: 'Product Photo Deleted', category: 'product' },
  // Sale actions
  { value: 'SALE_COMPLETED', label: 'Sale Completed', category: 'sale' },
  { value: 'INVOICE_CREATED', label: 'Invoice Created', category: 'sale' },
  { value: 'INVOICE_DELETED', label: 'Invoice Deleted', category: 'sale' },
  // Customer actions
  { value: 'CUSTOMER_ADDED', label: 'Customer Added', category: 'customer' },
  { value: 'CUSTOMER_UPDATED', label: 'Customer Updated', category: 'customer' },
  { value: 'CUSTOMER_DELETED', label: 'Customer Deleted', category: 'customer' },
  // User actions
  { value: 'USER_LOGIN', label: 'User Login', category: 'user' },
  { value: 'USER_LOGOUT', label: 'User Logout', category: 'user' },
  { value: 'USER_REGISTERED', label: 'User Registered', category: 'user' },
  { value: 'USER_APPROVED', label: 'User Approved', category: 'user' },
  { value: 'USER_PASSWORD_CHANGED', label: 'Password Changed', category: 'user' },
  { value: 'USER_PHOTO_UPDATED', label: 'User Photo Updated', category: 'user' },
  { value: 'USER_PHOTO_DELETED', label: 'User Photo Deleted', category: 'user' },
  // Expense actions
  { value: 'EXPENSE_ADDED', label: 'Expense Added', category: 'expense' },
  { value: 'EXPENSE_UPDATED', label: 'Expense Updated', category: 'expense' },
  { value: 'EXPENSE_DELETED', label: 'Expense Deleted', category: 'expense' },
  // Admin actions
  { value: 'ADMIN_PASSWORD_CHANGED', label: 'Admin Password Changed', category: 'admin' },
  { value: 'ADMIN_CLEAR_DATABASE', label: 'Database Cleared', category: 'admin' },
  { value: 'ADMIN_UPDATE_COMPANY_PHONE', label: 'Company Phone Updated', category: 'admin' },
];

// Date range options
const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

// Items per page options
const PAGE_SIZES = [25, 50, 100, 200];

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);

  // Calculate date range boundaries
  const getDateRangeBounds = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return { start: today.toISOString(), end: now.toISOString() };
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart.toISOString(), end: now.toISOString() };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart.toISOString(), end: now.toISOString() };
      }
      default:
        return null;
    }
  }, [dateRange]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('limit', pageSize);
      params.append('skip', (page - 1) * pageSize);
      
      if (filter !== 'all') {
        params.append('action', filter);
      }
      
      const dateBounds = getDateRangeBounds();
      if (dateBounds) {
        params.append('startDate', dateBounds.start);
        params.append('endDate', dateBounds.end);
      }

      const res = await fetch(API(`/api/audit-logs?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        // Support both array and object response formats
        if (Array.isArray(data)) {
          setLogs(data);
          setTotalLogs(data.length);
        } else {
          setLogs(data.logs || []);
          setTotalLogs(data.total || data.logs?.length || 0);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError(err.message || 'Unable to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filter, dateRange, page, pageSize, getDateRangeBounds]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, dateRange, pageSize]);

  const getActionIcon = (action) => {
    if (action?.includes('PRODUCT') || action?.includes('STOCK')) return 'package';
    if (action?.includes('SALE') || action?.includes('INVOICE')) return 'shopping-cart';
    if (action?.includes('CUSTOMER')) return 'users';
    if (action?.includes('EXPENSE')) return 'credit-card';
    if (action?.includes('USER') || action?.includes('LOGIN') || action?.includes('LOGOUT')) return 'user';
    if (action?.includes('ADMIN') || action?.includes('PASSWORD')) return 'shield';
    return 'activity';
  };

  const getActionColor = (action) => {
    if (action?.includes('DELETED') || action?.includes('CLEAR')) return 'var(--color-danger, #ef4444)';
    if (action?.includes('ADDED') || action?.includes('COMPLETED') || action?.includes('CREATED')) return 'var(--color-success, #22c55e)';
    if (action?.includes('UPDATED') || action?.includes('APPROVED') || action?.includes('CHANGED')) return 'var(--color-primary, #3b82f6)';
    if (action?.includes('LOGIN') || action?.includes('LOGOUT')) return 'var(--color-purple, #8b5cf6)';
    if (action?.includes('EXPENSE')) return 'var(--color-warning, #f59e0b)';
    return 'var(--color-gray, #6b7280)';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const detailsStr = typeof log.details === 'object' 
      ? JSON.stringify(log.details) 
      : String(log.details || '');
    return (
      log.action?.toLowerCase().includes(query) ||
      log.username?.toLowerCase().includes(query) ||
      detailsStr.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalLogs / pageSize);

  // Stats calculation
  const stats = {
    total: logs.length,
    products: logs.filter(l => l.action?.includes('PRODUCT') || l.action?.includes('STOCK')).length,
    sales: logs.filter(l => l.action?.includes('SALE') || l.action?.includes('INVOICE')).length,
    users: logs.filter(l => l.action?.includes('USER') || l.action?.includes('LOGIN') || l.action?.includes('LOGOUT')).length,
  };

  return (
    <div className="audit-logs-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon" style={{ background: 'var(--gradient-purple, linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%))' }}>
            <Icon name="audit" size={28} />
          </div>
          <div className="header-text">
            <h1>Audit Logs</h1>
            <p>Track all changes and activities in your system</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchAuditLogs} disabled={loading}>
          <Icon name={loading ? 'loader' : 'refresh'} size={18} className={loading ? 'spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search logs by action, user, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        
        <div className="filter-group">
          {/* Date Range Filter */}
          <div className="date-filter-btns">
            {DATE_RANGES.map(range => (
              <button
                key={range.value}
                className={`date-filter-btn ${dateRange === range.value ? 'active' : ''}`}
                onClick={() => setDateRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {/* Action Type Filter */}
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {ACTION_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="filter-select page-size-select"
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size} per page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="audit-stats">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total Logs</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.products}</span>
          <span className="stat-label">Product Changes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.sales}</span>
          <span className="stat-label">Sales</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.users}</span>
          <span className="stat-label">User Activities</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <Icon name="alert-triangle" size={20} />
          <span>{error}</span>
          <button onClick={fetchAuditLogs}>Retry</button>
        </div>
      )}

      {/* Logs List */}
      <div className="audit-logs-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Icon name="inbox" size={48} />
            </div>
            <h3>No Audit Logs Found</h3>
            <p>{searchQuery ? 'Try adjusting your search or filters' : 'There are no logs matching your criteria'}</p>
            {(filter !== 'all' || dateRange !== 'all' || searchQuery) && (
              <button 
                className="clear-filters-btn"
                onClick={() => {
                  setFilter('all');
                  setDateRange('all');
                  setSearchQuery('');
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="logs-timeline">
              {filteredLogs.map((log, index) => (
                <div key={log._id || log.id || index} className="log-item">
                  <div className="log-timeline">
                    <div 
                      className="log-dot" 
                      style={{ background: getActionColor(log.action) }}
                    />
                    {index < filteredLogs.length - 1 && <div className="log-line" />}
                  </div>
                  <div className="log-card">
                    <div className="log-header">
                      <div className="log-action">
                        <div 
                          className="action-icon" 
                          style={{ 
                            background: `color-mix(in srgb, ${getActionColor(log.action)} 15%, transparent)`,
                            color: getActionColor(log.action)
                          }}
                        >
                          <Icon name={getActionIcon(log.action)} size={16} />
                        </div>
                        <span className="action-text">{log.action?.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="log-time">{formatDateTime(log.timestamp || log.createdAt)}</span>
                    </div>
                    <div className="log-body">
                      <div className="log-user">
                        <Icon name="user" size={14} />
                        <span>{log.username || log.performedBy || 'System'}</span>
                      </div>
                      {log.details && (
                        <p className="log-details">
                          {typeof log.details === 'object' 
                            ? Object.entries(log.details)
                                .map(([key, val]) => `${key}: ${val}`)
                                .join(', ')
                            : log.details
                          }
                        </p>
                      )}
                      {log.metadata && (
                        <details className="log-metadata">
                          <summary>View Details</summary>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  <Icon name="chevrons-left" size={16} />
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <Icon name="chevron-left" size={16} />
                </button>
                <span className="pagination-info">
                  Page {page} of {totalPages}
                </span>
                <button 
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <Icon name="chevron-right" size={16} />
                </button>
                <button 
                  className="pagination-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  <Icon name="chevrons-right" size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
