/**
 * @file CustomerPortal.jsx
 * @description Ultra-Premium Customer portal container with state-of-the-art navigation and technical styling
 */

import React, { useState } from 'react';
import Icon from '../../Icon';
import CustomerDashboard from './CustomerDashboard';
import CustomerInvoices from './CustomerInvoices';
import CustomerWarranties from './CustomerWarranties';
import CustomerEMI from './CustomerEMI';
import CustomerProfile from './CustomerProfile';
import CustomerSupport from './CustomerSupport';
import './customerPortal.css';

const CustomerPortal = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Home', icon: 'grid' },
    { id: 'invoices', label: 'Invoices', icon: 'file-text' },
    { id: 'warranties', label: 'Warranties', icon: 'shield' },
    { id: 'emi', label: 'EMI Plans', icon: 'credit-card' },
    { id: 'support', label: 'Support Desk', icon: 'help-circle' },
    { id: 'profile', label: 'My Profile', icon: 'user' }
  ];

  return (
    <div className="customer-portal">
      <div className="portal-shell">
        <div className="portal-main-layout">
          {/* Unified Sidebar */}
          <aside className="portal-sidebar">
            <div className="sidebar-header" style={{ padding: '0 0.75rem', marginBottom: '2rem' }}>
              <div className="portal-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--portal-accent)' }}>
                <Icon name="package" size={24} />
                <span className="brand-name" style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--portal-secondary)', letterSpacing: '-0.01em' }}>PORTAL</span>
              </div>
            </div>

            <nav className="sidebar-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div className="tab-icon-wrap">
                    <Icon name={tab.icon} size={18} />
                  </div>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--portal-border)' }}>
              <div className="user-profile-summary" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0 0.75rem' }}>
                <div className="user-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--portal-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem' }}>
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--portal-text)' }}>{currentUser?.name || 'User'}</span>
              </div>
              <button className="logout-btn" onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '0.75rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                <Icon name="power" size={16} />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Clean Content View */}
          <main className="portal-content-view">
            {activeTab === 'dashboard' && <CustomerDashboard currentUser={currentUser} />}
            {activeTab === 'invoices' && <CustomerInvoices currentUser={currentUser} />}
            {activeTab === 'warranties' && <CustomerWarranties currentUser={currentUser} />}
            {activeTab === 'emi' && <CustomerEMI currentUser={currentUser} />}
            {activeTab === 'support' && <CustomerSupport currentUser={currentUser} />}
            {activeTab === 'profile' && <CustomerProfile currentUser={currentUser} />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
