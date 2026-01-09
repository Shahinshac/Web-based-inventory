import React from 'react';
import Icon from '../../Icon';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'pos', label: 'POS', icon: 'shopping-cart' },
  { id: 'products', label: 'Products', icon: 'package' },
  { id: 'inventory', label: 'Inventory', icon: 'layers' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'invoices', label: 'Invoices', icon: 'file-text' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  { id: 'reports', label: 'Reports', icon: 'trending-up' },
];

const adminTabs = [
  { id: 'audit', label: 'Audit Logs', icon: 'clipboard-list', adminOnly: true },
  { id: 'users', label: 'Users', icon: 'shield', adminOnly: true },
];

export default function TabNavigation({ activeTab, onTabChange, isAdmin }) {
  const allTabs = isAdmin ? [...tabs, ...adminTabs] : tabs;

  return (
    <nav className="tab-navigation" style={{
      display: 'block',
      background: 'rgba(0, 0, 0, 0.2)',
      padding: '12px 20px',
      overflowX: 'auto',
      overflowY: 'hidden'
    }}>
      <div className="tab-list" style={{
        display: 'flex',
        gap: '8px',
        minWidth: 'max-content',
        flexWrap: 'nowrap',
        alignItems: 'center'
      }}>
        {allTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.adminOnly ? 'admin-tab' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: activeTab === tab.id ? 'white' : 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: activeTab === tab.id ? '#667eea' : 'white',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: activeTab === tab.id ? '0 4px 16px rgba(0, 0, 0, 0.2)' : 'none'
            }}
          >
            <Icon name={tab.icon} size={18} />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
