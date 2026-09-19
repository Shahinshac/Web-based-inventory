import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../Icon';
import { normalizePhotoUrl } from '../../utils/api';

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  currentUser, 
  isAdmin, 
  userRole, 
  onLogout, 
  onUpdatePhoto 
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePhoto) return;

    try {
      setIsUploadingPhoto(true);
      await onUpdatePhoto(file);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isManager = userRole === 'manager';
  const isAdminRole = userRole === 'admin' || isAdmin;
  const isManagerOrAdmin = isManager || isAdminRole;

  // Grouped Navigation Sections
  const navSections = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', label: 'Overview', icon: 'grid', show: isManagerOrAdmin },
        { id: 'pos', label: 'New Sale', icon: 'shopping-cart', show: true },
        { id: 'returns', label: 'Sales Returns', icon: 'rotate-ccw', show: true },
      ]
    },
    {
      title: 'Catalog & Services',
      items: [
        { id: 'products', label: 'Inventory', icon: 'package', show: isManagerOrAdmin },
        { id: 'warranty', label: 'Warranties', icon: 'shield', show: isManagerOrAdmin },
      ]
    },
    {
      title: 'Finance & Sales',
      items: [
        { id: 'invoices', label: 'Billing History', icon: 'file-text', show: true },
        { id: 'emi', label: 'EMI Dashboard', icon: 'credit-card', show: isManagerOrAdmin },
        { id: 'expenses', label: 'OpEx / Expenses', icon: 'dollar-sign', show: isManagerOrAdmin },
        { id: 'reports', label: 'Analytics', icon: 'bar-chart-2', show: isManagerOrAdmin },
      ]
    },
    {
      title: 'Relationships',
      items: [
        { id: 'customers', label: 'CRM / Customers', icon: 'users', show: true },
        { id: 'approvals', label: 'Approvals', icon: 'check-circle', show: isManagerOrAdmin },
        { id: 'support', label: 'Support Desk', icon: 'help-circle', show: true },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Staff Management', icon: 'users', show: isAdminRole },
        { id: 'customer-logins', label: 'Portal Access', icon: 'key', show: isAdminRole },
        { id: 'audit', label: 'System Logs', icon: 'activity', show: isAdminRole },
        { id: 'exports', label: 'Data Exports', icon: 'download', show: isAdminRole },
        { id: 'admin-settings', label: 'Admin Panel', icon: 'settings', show: isAdminRole },
      ]
    }
  ];

  return (
    <aside className={`erp-sidebar premium-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => setCollapsed(!collapsed)} title="Click to collapse/expand">
        <div className="sidebar-brand-icon">
          <Icon name="package" size={16} />
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span className="sidebar-brand-name">26:07 Inventory</span>
            <span className="sidebar-brand-sub">📞 7594012761</span>
          </div>
        )}
      </div>

      {/* Navigation list */}
      <nav className="sidebar-nav">
        {navSections.map(section => {
          const visibleItems = section.items.filter(item => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-label">
                  {section.title}
                </div>
              )}
              {visibleItems.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onTabChange(item.id)}
                    title={collapsed ? item.label : ''}
                  >
                    <span className="sidebar-item-icon">
                      <Icon name={item.icon} size={18} />
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer with user profile */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div 
            className="sidebar-user" 
            onClick={() => fileInputRef.current?.click()}
            title="Click avatar to update photo"
            style={{ flex: 1, minWidth: 0 }}
          >
            <div className="sidebar-avatar" style={{ position: 'relative' }}>
              {isUploadingPhoto && (
                <div style={{ 
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 
                }}>
                  <Icon name="loader" size={12} className="spin" />
                </div>
              )}
              {currentUser?.photo ? (
                <img
                  src={normalizePhotoUrl(currentUser.photo)}
                  alt={currentUser.username}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span>{(currentUser?.username || 'A').charAt(0).toUpperCase()}</span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {!collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <span className="sidebar-user-name">
                  {currentUser?.username || 'Staff User'}
                </span>
                <span className="sidebar-user-role">
                  {userRole || 'Admin'}
                </span>
              </div>
            )}
          </div>

          <button 
            className="sidebar-logout logout-btn" 
            onClick={onLogout} 
            title="Logout"
            aria-label="Logout"
          >
            <Icon name="log-out" size={18} />
            {!collapsed && <span style={{ fontSize: '11.5px', fontWeight: 600, marginLeft: '4px' }}>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
