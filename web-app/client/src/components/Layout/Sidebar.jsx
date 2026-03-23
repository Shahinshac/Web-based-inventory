import React, { useState } from 'react';
import Icon from '../../Icon';
import { normalizePhotoUrl } from '../../utils/api';

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  isAdmin, 
  userRole,
  onLogout 
}) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid', show: true },
    { id: 'pos', label: 'Point of Sale', icon: 'shopping-cart', show: true },
    { id: 'products', label: 'Inventory array', icon: 'package', show: true },
    { id: 'customers', label: 'Customers', icon: 'users', show: true },
    { id: 'invoices', label: 'Invoices', icon: 'file-text', show: true },
    { id: 'analytics', label: 'Analytics', icon: 'pie-chart', show: true },
    { id: 'reports', label: 'Reports', icon: 'bar-chart-2', show: true },
    { id: 'returns', label: 'Returns', icon: 'rotate-ccw', show: true },
    { id: 'expenses', label: 'Expenses', icon: 'dollar-sign', show: true },
    { id: 'users', label: 'Team', icon: 'users', show: isAdmin },
    { id: 'audit', label: 'Audit Logs', icon: 'activity', show: isAdmin },
    { id: 'exports', label: 'Exports', icon: 'download', show: isAdmin },
  ];

  return (
    <aside className={`premium-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand" onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <Icon name="package" size={24} />
          </div>
          {!collapsed && (
            <div className="brand-info">
              <span className="brand-name">26-07 Inventory</span>
              <span className="brand-phone">📞 7594012761</span>
            </div>
          )}
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.filter(item => item.show).map(item => (
          <button
            key={item.id}
            className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={collapsed ? item.label : ''}
          >
            <Icon name={item.icon} size={20} />
            {!collapsed && <span>{item.label}</span>}
            {activeTab === item.id && !collapsed && <div className="active-indicator" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile" title={collapsed ? currentUser?.username || 'Admin' : ''}>
          <div className="avatar" style={{
            width: '32px', height: '32px', borderRadius: '50%',
            overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
            flexShrink: 0
          }}>
            {currentUser?.photo ? (
              <img
                src={normalizePhotoUrl(currentUser.photo)}
                alt={currentUser.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <span style={{ display: currentUser?.photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Icon name="user" size={18} />
            </span>
          </div>
          {!collapsed && (
            <div className="user-details">
              <span className="name">{currentUser?.username || 'Admin'}</span>
              <span className="role">{userRole || 'Superadmin'}</span>
            </div>
          )}
        </div>
        <button className="logout-btn" onClick={onLogout} title={collapsed ? 'Logout' : ''}>
          <Icon name="log-out" size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
