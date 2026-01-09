import React from 'react';
import Icon from '../../Icon';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout', shortcut: 'F1' },
  { id: 'pos', label: 'POS System', icon: 'shopping-cart', shortcut: 'F2' },
  { id: 'products', label: 'Products', icon: 'package', shortcut: 'F3' },
  { id: 'customers', label: 'Customers', icon: 'users', shortcut: 'F4' },
  { id: 'invoices', label: 'Invoices', icon: 'file-text', shortcut: 'F5' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', shortcut: 'F6' },
  { id: 'reports', label: 'Reports', icon: 'trending-up', shortcut: 'F7' }
];

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <nav className="tab-navigation">
      <div className="tab-list">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={`${tab.label} (${tab.shortcut})`}
          >
            <Icon name={tab.icon} size={20} />
            <span className="tab-label">{tab.label}</span>
            <span className="tab-shortcut">{tab.shortcut}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
