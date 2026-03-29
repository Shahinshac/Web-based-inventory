/**
 * @file CustomerPortal.jsx
 * @description Customer portal main container with navigation and views
 * Displays customer dashboard, invoices, warranties, and profile
 */

import React, { useState } from 'react';
import Icon from '../../Icon.jsx';
import CustomerDashboard from './CustomerDashboard';
import CustomerInvoices from './CustomerInvoices';
import CustomerWarranties from './CustomerWarranties';
import CustomerProfile from './CustomerProfile';
import './customerPortal.css';

const CustomerPortal = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
    { id: 'invoices', label: 'Invoices', icon: 'layers' },
    { id: 'warranties', label: 'Warranties', icon: 'shield' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ];

  return (
    <div className="customer-portal-desktop">
      {/* Sidebar Navigation */}
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <div className="brand-logo"><Icon name="zap" size={24} /></div>
          <span>26:07 Electronics</span>
        </div>
        
        <nav className="portal-nav-vertical">
          <div className="nav-section-title">MAIN MENU</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab-vertical ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <button className="logout-btn-sidebar" onClick={onLogout} title="Sign Out">
            <Icon name="log-out" size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="portal-main-area">
        {/* Topbar */}
        <header className="portal-topbar">
          <div className="portal-page-heading">
            <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>
          
          <div className="portal-user-chip">
            <div className="user-avatar">
              {currentUser?.name?.charAt(0) || currentUser?.username?.charAt(0) || 'C'}
            </div>
            <div className="user-details">
              <span className="user-name">{currentUser?.name || currentUser?.username}</span>
              <span className="user-role">Customer Account</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="portal-content-wrapper">
          <div className="portal-content-inner">
            {activeTab === 'dashboard' && <CustomerDashboard currentUser={currentUser} />}
            {activeTab === 'invoices' && <CustomerInvoices currentUser={currentUser} />}
            {activeTab === 'warranties' && <CustomerWarranties currentUser={currentUser} />}
            {activeTab === 'profile' && <CustomerProfile currentUser={currentUser} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerPortal;
