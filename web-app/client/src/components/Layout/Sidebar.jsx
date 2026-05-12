import React, { useState, useEffect } from 'react';
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
  const [liveTime, setLiveTime] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef(null);

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

  // Live clock - update every second
  useEffect(() => {
    const tick = () => {
      setLiveTime(new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'Asia/Kolkata'
      }).format(new Date()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isManager = userRole === 'manager';
  const isAdminRole = userRole === 'admin' || isAdmin;
  const isManagerOrAdmin = isManager || isAdminRole;

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: 'grid', show: isManagerOrAdmin },
    { id: 'pos', label: 'New Sale', icon: 'shopping-cart', show: true },
    { id: 'products', label: 'Inventory', icon: 'package', show: isManagerOrAdmin },
    { id: 'warranty', label: 'Warranties', icon: 'shield', show: isManagerOrAdmin },
    { id: 'emi', label: 'EMI Dashboard', icon: 'credit-card', show: isManagerOrAdmin },
    { id: 'customers', label: 'CRM / Customers', icon: 'users', show: true },
    { id: 'invoices', label: 'Billing History', icon: 'file-text', show: true },
    { id: 'reports', label: 'Analytics', icon: 'bar-chart-2', show: isManagerOrAdmin },
    { id: 'approvals', label: 'Approvals', icon: 'check-circle', show: isManagerOrAdmin },
    { id: 'returns', label: 'Sales Returns', icon: 'rotate-ccw', show: true },
    { id: 'expenses', label: 'OpEx / Expenses', icon: 'dollar-sign', show: isManagerOrAdmin },
    { id: 'users', label: 'Staff Management', icon: 'users', show: isAdminRole },
    { id: 'support', label: 'Support Desk', icon: 'help-circle', show: true },
    { id: 'audit', label: 'System Logs', icon: 'activity', show: isAdminRole },
    { id: 'exports', label: 'Data Exports', icon: 'download', show: isAdminRole },
    { id: 'admin-settings', label: 'Admin Panel', icon: 'settings', show: isAdminRole },
    { id: 'customer-logins', label: 'Portal Access', icon: 'key', show: isAdminRole },
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
        {/* Live Time in Sidebar */}
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            marginTop: '16px', padding: '8px 14px',
            background: 'rgba(99, 102, 241, 0.08)',
            borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            color: '#6366f1', fontVariantNumeric: 'tabular-nums'
          }}>
            <Icon name="clock" size={14} />
            <span>{liveTime}</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>IST</span>
          </div>
        )}
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
          <div className="avatar" 
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile photo"
            style={{
            width: '32px', height: '32px', borderRadius: '50%',
            overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
            flexShrink: 0, cursor: 'pointer', position: 'relative'
          }}>
            {isUploadingPhoto && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <Icon name="loader" size={16} className="spin" style={{ color: 'white' }} />
              </div>
            )}
            {currentUser?.photo ? (
              <img
                src={normalizePhotoUrl(currentUser.photo)}
                alt={currentUser.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <span style={{ display: currentUser?.photo ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <Icon name="camera" size={16} />
            </span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePhotoUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
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
