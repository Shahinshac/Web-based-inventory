import React from 'react';

// All available tabs with role access configuration
const allTabs = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📊', roles: ['admin', 'manager', 'cashier'] },
  { id: 'pos', label: 'POS', emoji: '🛒', roles: ['admin', 'manager', 'cashier'] },
  { id: 'products', label: 'Products', emoji: '📦', roles: ['admin', 'manager', 'cashier'] },
  { id: 'inventory', label: 'Inventory', emoji: '📋', roles: ['admin', 'manager'] },
  { id: 'customers', label: 'Customers', emoji: '👥', roles: ['admin', 'manager', 'cashier'] },
  { id: 'invoices', label: 'Invoices', emoji: '📄', roles: ['admin', 'manager', 'cashier'] },
  { id: 'analytics', label: 'Analytics', emoji: '📈', roles: ['admin', 'manager'] },
  { id: 'reports', label: 'Reports', emoji: '📑', roles: ['admin', 'manager'] },
  { id: 'audit', label: 'Audit Logs', emoji: '📝', roles: ['admin'], adminOnly: true },
  { id: 'users', label: 'Users', emoji: '🔐', roles: ['admin'], adminOnly: true },
];

export default function TabNavigation({ activeTab, onTabChange, isAdmin, userRole }) {
  // Determine effective role
  const effectiveRole = isAdmin ? 'admin' : (userRole || 'cashier');
  
  // Filter tabs based on user role
  const visibleTabs = allTabs.filter(tab => tab.roles.includes(effectiveRole));

  return (
    <nav className="tab-navigation">
      <div className="tab-list">
        {visibleTabs.map(tab => (
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
