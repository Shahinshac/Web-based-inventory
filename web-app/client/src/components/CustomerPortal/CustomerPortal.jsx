/**
 * @file CustomerPortal.jsx
 * @description Main customer portal container with navigation and views
 * Displays customer dashboard, invoices, warranties, EMI plans, and profile
 */

import React, { useState } from 'react';
import Icon from '../../Icon';
import CustomerDashboard from './CustomerDashboard';
import CustomerInvoices from './CustomerInvoices';
import CustomerWarranties from './CustomerWarranties';
import CustomerEMI from './CustomerEMI';
import CustomerProfile from './CustomerProfile';
import './CustomerPortal.css';

const CustomerPortal = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'analytics' },
    { id: 'invoices', label: 'Invoices', icon: 'layers' },
    { id: 'warranties', label: 'Warranties', icon: 'shield' },
    { id: 'emi', label: 'EMI Plans', icon: 'credit-card' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ];

  return (
    <div className="customer-portal">
      {/* Header */}
      <header className="portal-header">
        <div className="portal-brand">
          <Icon name="spark" size={28} />
          <span className="brand-name">26:07 Electronics</span>
        </div>
        <div className="portal-user-section">
          <div className="user-info">
            <Icon name="user" size={18} />
            <span className="user-name">{currentUser?.name || currentUser?.email}</span>
          </div>
          <button 
            className="logout-btn" 
            onClick={onLogout} 
            title="Logout"
            aria-label="Logout"
          >
            <Icon name="log-out" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="portal-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <Icon name={tab.icon} size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <main className="portal-content">
        {activeTab === 'dashboard' && <CustomerDashboard currentUser={currentUser} />}
        {activeTab === 'invoices' && <CustomerInvoices currentUser={currentUser} />}
        {activeTab === 'warranties' && <CustomerWarranties currentUser={currentUser} />}
        {activeTab === 'emi' && <CustomerEMI currentUser={currentUser} />}
        {activeTab === 'profile' && <CustomerProfile currentUser={currentUser} />}
      </main>
    </div>
  );
};

export default CustomerPortal;
