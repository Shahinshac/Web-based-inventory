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
    <div className="customer-portal">
      {/* Header */}
      <div className="portal-header">
        <div className="portal-brand">
          <Icon name="spark" size={28} />
          <span>26:07 Electronics</span>
        </div>
        <div className="portal-user-info">
          <span className="user-name">{currentUser?.name || currentUser?.username}</span>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="portal-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="portal-content">
        {activeTab === 'dashboard' && <CustomerDashboard currentUser={currentUser} />}
        {activeTab === 'invoices' && <CustomerInvoices currentUser={currentUser} />}
        {activeTab === 'warranties' && <CustomerWarranties currentUser={currentUser} />}
        {activeTab === 'profile' && <CustomerProfile currentUser={currentUser} />}
      </div>
    </div>
  );
};

export default CustomerPortal;
