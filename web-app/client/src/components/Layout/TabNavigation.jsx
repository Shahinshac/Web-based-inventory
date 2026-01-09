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
  { id: 'audit', label: 'Audit Logs', icon: 'audit', adminOnly: true },
  { id: 'users', label: 'Users', icon: 'lock', adminOnly: true },
];

export default function TabNavigation({ activeTab, onTabChange, isAdmin }) {
  const allTabs = isAdmin ? [...tabs, ...adminTabs] : tabs;

  return (
    <nav className="tab-navigation">
      <div className="tab-list">
        {allTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${tab.adminOnly ? 'admin-tab' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
          >
            <Icon name={tab.icon} size={18} />
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
