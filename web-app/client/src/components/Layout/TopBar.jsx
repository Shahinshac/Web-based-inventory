import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';

const TAB_TITLES = {
  dashboard: { title: 'Overview & KPI Metrics', category: 'Operations' },
  pos: { title: 'Point of Sale (New Sale)', category: 'Sales' },
  products: { title: 'Inventory & Product Catalog', category: 'Catalog' },
  warranty: { title: 'Warranty Tracking', category: 'Services' },
  emi: { title: 'EMI & Payment Plans', category: 'Finance' },
  customers: { title: 'Customer Directory & CRM', category: 'CRM' },
  invoices: { title: 'Billing History & Invoices', category: 'Finance' },
  reports: { title: 'Financial Analytics & Reports', category: 'Analytics' },
  approvals: { title: 'Pending Approvals', category: 'Management' },
  returns: { title: 'Sales Returns & Refunds', category: 'Operations' },
  expenses: { title: 'Operating Expenses', category: 'Finance' },
  users: { title: 'Staff & Team Management', category: 'Administration' },
  support: { title: 'Customer Support Desk', category: 'Support' },
  audit: { title: 'System Audit Logs', category: 'Security' },
  exports: { title: 'Data Export Center', category: 'Data' },
  'admin-settings': { title: 'System Settings', category: 'Configuration' },
  'customer-logins': { title: 'Customer Portal Access', category: 'Access' }
};

export default function TopBar({
  activeTab,
  currentUser,
  userRole,
  isOnline = true,
  onOpenShortcuts
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'Asia/Kolkata'
      }).format(new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const meta = TAB_TITLES[activeTab] || { title: activeTab, category: 'ERP' };

  return (
    <header className="erp-topbar">
      <div className="topbar-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
          {meta.category}
        </span>
        <span style={{ color: 'var(--border)' }}>/</span>
        <h1 className="topbar-title" style={{ margin: 0 }}>
          {meta.title}
        </h1>
      </div>

      <div className="topbar-right" style={{ marginLeft: 'auto' }}>
        {/* Live IST clock */}
        <div className="topbar-status topbar-clock desktop-only" title="Indian Standard Time (Asia/Kolkata)">
          <Icon name="clock" size={13} style={{ color: 'var(--primary)' }} />
          <span className="tabular">{currentTime} IST</span>
        </div>

        {/* Connection status */}
        <div className="topbar-status">
          <span 
            className="dot" 
            style={{ 
              backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)',
              boxShadow: isOnline ? '0 0 6px var(--success)' : 'none'
            }} 
          />
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User badge */}
        <div className="topbar-status desktop-only" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          <span>{currentUser?.username || 'Admin'}</span>
          <span style={{ 
            fontSize: '10px', 
            padding: '1px 6px', 
            borderRadius: '4px', 
            backgroundColor: 'var(--primary-light)', 
            color: 'var(--primary-text)',
            textTransform: 'uppercase'
          }}>
            {userRole || 'Admin'}
          </span>
        </div>

        {/* Keyboard Shortcuts button */}
        {onOpenShortcuts && (
          <button 
            className="topbar-status desktop-only" 
            onClick={onOpenShortcuts}
            title="Keyboard Shortcuts (Ctrl+H)"
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border)', 
              cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <Icon name="help-circle" size={13} style={{ color: 'var(--primary)' }} />
            <span>Shortcuts</span>
          </button>
        )}
      </div>
    </header>
  );
}
