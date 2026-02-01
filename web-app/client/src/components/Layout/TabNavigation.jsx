import React from 'react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { id: 'pos', label: 'POS', emoji: '🛒' },
  { id: 'products', label: 'Products', emoji: '📦' },
  { id: 'inventory', label: 'Inventory', emoji: '📋' },
  { id: 'customers', label: 'Customers', emoji: '👥' },
  { id: 'invoices', label: 'Invoices', emoji: '📄' },
  { id: 'analytics', label: 'Analytics', emoji: '📈' },
  { id: 'reports', label: 'Reports', emoji: '📑' },
];

const adminTabs = [
  { id: 'audit', label: 'Audit Logs', emoji: '📝', adminOnly: true },
  { id: 'users', label: 'Users', emoji: '🔐', adminOnly: true },
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
            <span className="tab-emoji">{tab.emoji}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
