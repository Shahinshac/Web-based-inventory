import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [filter]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? '/api/audit-logs?limit=100' 
        : `/api/audit-logs?limit=100&action=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'PRODUCT_ADDED', label: 'Product Added' },
    { value: 'PRODUCT_UPDATED', label: 'Product Updated' },
    { value: 'PRODUCT_DELETED', label: 'Product Deleted' },
    { value: 'SALE_COMPLETED', label: 'Sale Completed' },
    { value: 'CUSTOMER_ADDED', label: 'Customer Added' },
    { value: 'USER_LOGIN', label: 'User Login' },
    { value: 'USER_REGISTERED', label: 'User Registered' },
    { value: 'USER_APPROVED', label: 'User Approved' },
    { value: 'ADMIN_PASSWORD_CHANGED', label: 'Admin Password Changed' },
  ];

  const getActionIcon = (action) => {
    if (action?.includes('PRODUCT')) return 'package';
    if (action?.includes('SALE')) return 'shopping-cart';
    if (action?.includes('CUSTOMER')) return 'users';
    if (action?.includes('USER') || action?.includes('LOGIN')) return 'lock';
    if (action?.includes('ADMIN')) return 'lock';
    return 'activity';
  };

  const getActionColor = (action) => {
    if (action?.includes('DELETED')) return '#ef4444';
    if (action?.includes('ADDED') || action?.includes('COMPLETED')) return '#22c55e';
    if (action?.includes('UPDATED') || action?.includes('APPROVED')) return '#3b82f6';
    if (action?.includes('LOGIN')) return '#8b5cf6';
    return '#6b7280';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.username?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="audit-logs-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
            <Icon name="audit" size={28} />
          </div>
          <div className="header-text">
            <h1>Audit Logs</h1>
            <p>Track all changes and activities in your system</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchAuditLogs}>
          <Icon name="refresh" size={18} />
          Refresh
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
        </div>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          {actionTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      <div className="audit-stats">
        <div className="stat-item">
          <span className="stat-number">{logs.length}</span>
          <span className="stat-label">Total Logs</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{logs.filter(l => l.action?.includes('PRODUCT')).length}</span>
          <span className="stat-label">Product Changes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{logs.filter(l => l.action?.includes('SALE')).length}</span>
          <span className="stat-label">Sales</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{logs.filter(l => l.action?.includes('USER') || l.action?.includes('LOGIN')).length}</span>
          <span className="stat-label">User Activities</span>
        </div>
      </div>

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
            <p>There are no logs matching your criteria</p>
          </div>
        ) : (
          <div className="logs-timeline">
            {filteredLogs.map((log, index) => (
              <div key={log._id || index} className="log-item">
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
                        style={{ background: `${getActionColor(log.action)}20`, color: getActionColor(log.action) }}
                      >
                        <Icon name={getActionIcon(log.action)} size={16} />
                      </div>
                      <span className="action-text">{log.action?.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="log-time">{formatDate(log.timestamp || log.createdAt)}</span>
                  </div>
                  <div className="log-body">
                    <div className="log-user">
                      <Icon name="user" size={14} />
                      <span>{log.username || log.performedBy || 'System'}</span>
                    </div>
                    {log.details && (
                      <p className="log-details">{log.details}</p>
                    )}
                    {log.metadata && (
                      <div className="log-metadata">
                        <code>{JSON.stringify(log.metadata, null, 2)}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
