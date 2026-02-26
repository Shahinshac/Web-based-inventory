import React from 'react';
import Icon from '../../Icon';

// All available tabs with role access configuration
const allTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', roles: ['admin', 'manager', 'cashier'] },
  { id: 'pos', label: 'POS', icon: 'shopping-cart', roles: ['admin', 'manager', 'cashier'] },
  { id: 'products', label: 'Products', icon: 'package', roles: ['admin', 'manager', 'cashier'] },
  { id: 'inventory', label: 'Inventory', icon: 'clipboard', roles: ['admin', 'manager'] },
  { id: 'customers', label: 'Customers', icon: 'users', roles: ['admin', 'manager', 'cashier'] },
  { id: 'invoices', label: 'Invoices', icon: 'file-text', roles: ['admin', 'manager', 'cashier'] },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', roles: ['admin', 'manager'] },
  { id: 'reports', label: 'Reports', icon: 'pie-chart', roles: ['admin', 'manager'] },
  { id: 'audit', label: 'Audit Logs', icon: 'shield', roles: ['admin'], adminOnly: true },
  { id: 'users', label: 'Users', icon: 'user-check', roles: ['admin'], adminOnly: true },
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
            <span className="tab-icon">
              <Icon name={tab.icon} size={16} />
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
