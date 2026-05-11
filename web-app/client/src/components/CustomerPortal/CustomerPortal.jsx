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
    { id: 'dashboard', label: 'Overview', icon: 'activity' },
    { id: 'invoices', label: 'Billing', icon: 'file-text' },
    { id: 'warranties', label: 'Security', icon: 'shield' },
    { id: 'emi', label: 'Payments', icon: 'credit-card' },
    { id: 'support', label: 'Support', icon: 'help-circle' },
    { id: 'profile', label: 'Account', icon: 'user' }
  ];

  return (
    <div className="customer-portal">
      <div className="portal-shell">
        {/* State-of-the-Art Header */}
        <header className="portal-header">
          <div className="portal-brand">
            <Icon name="zap" size={28} />
            <div className="brand-stack">
              <span className="brand-name">TECHNOVA</span>
              <span className="brand-sub">Premium Inventory</span>
            </div>
          </div>

          <div className="portal-user-section">
            <div className="user-profile-summary">
              <div className="user-details">
                <span className="user-name">{currentUser?.name || 'Authorized User'}</span>
                <span className="user-status">Online</span>
              </div>
              <div className="user-avatar">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div className="divider-v"></div>

            <button 
              className="logout-btn" 
              onClick={onLogout} 
              aria-label="Secure Logout"
            >
              <Icon name="power" size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="portal-main-layout">
          {/* Side Navigation - Premium Glass */}
          <aside className="portal-sidebar">
            <div className="sidebar-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  <div className="tab-icon-wrap">
                    <Icon name={tab.icon} size={20} />
                  </div>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && <div className="active-indicator"></div>}
                </button>
              ))}
            </div>
            
            <div className="sidebar-footer">
              <div className="system-tag">
                <div className="pulse-dot"></div>
                <span>CORE SYSTEM V4.0</span>
              </div>
            </div>
          </aside>

          {/* Dynamic Content View */}
          <main className="portal-content-view">
            <div className="content-scroll-area">
              {activeTab === 'dashboard' && <CustomerDashboard currentUser={currentUser} />}
              {activeTab === 'invoices' && <CustomerInvoices currentUser={currentUser} />}
              {activeTab === 'warranties' && <CustomerWarranties currentUser={currentUser} />}
              { activeTab === 'emi' && <CustomerEMI currentUser={currentUser} />}
              { activeTab === 'support' && <CustomerSupport currentUser={currentUser} />}
              { activeTab === 'profile' && <CustomerProfile currentUser={currentUser} />}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation Interface */}
      <nav className="portal-nav-mobile" aria-label="Mobile Command Center">
        {tabs.map(tab => (
          <button
            key={`mobile-${tab.id}`}
            className={`portal-mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon name={tab.icon} size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <style jsx>{`
        .portal-main-layout {
          display: flex;
          min-height: calc(100vh - 80px);
        }

        .brand-stack { display: flex; flex-direction: column; line-height: 1; }
        .brand-name { font-size: 1.25rem; font-weight: 900; letter-spacing: 0.1em; color: white; }
        .brand-sub { font-size: 0.65rem; font-weight: 700; color: var(--portal-accent); letter-spacing: 0.05em; margin-top: 2px; }

        .user-profile-summary { display: flex; align-items: center; gap: 1rem; }
        .user-details { display: flex; flex-direction: column; align-items: flex-end; }
        .user-name { font-size: 0.95rem; font-weight: 700; color: white; }
        .user-status { font-size: 0.7rem; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.05em; }
        .divider-v { width: 1px; height: 32px; background: var(--portal-border); margin: 0 1rem; }

        .portal-sidebar {
          width: 260px;
          background: rgba(10, 10, 15, 0.4);
          border-right: 1px solid var(--portal-border);
          display: flex;
          flex-direction: column;
          padding: 2rem 1rem;
          position: sticky;
          top: 80px;
          height: calc(100vh - 80px);
        }

        .sidebar-nav { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
        
        .sidebar-tab {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 1.25rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 16px;
          color: var(--portal-text-dim);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }

        .sidebar-tab:hover { background: rgba(255, 255, 255, 0.03); color: white; }
        
        .sidebar-tab.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.2);
          color: white;
        }

        .tab-icon-wrap {
          color: var(--portal-text-dim);
          transition: all 0.3s;
        }

        .sidebar-tab.active .tab-icon-wrap {
          color: var(--portal-accent);
          filter: drop-shadow(0 0 8px var(--portal-accent-glow));
        }

        .active-indicator {
          position: absolute;
          left: 0;
          top: 25%;
          height: 50%;
          width: 4px;
          background: var(--portal-accent);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px var(--portal-accent);
        }

        .sidebar-footer { padding-top: 2rem; border-top: 1px solid var(--portal-border); }
        .system-tag { display: flex; align-items: center; gap: 0.75rem; font-size: 0.7rem; font-weight: 800; color: var(--portal-text-dim); letter-spacing: 0.1em; }
        .pulse-dot { width: 8px; height: 8px; background: var(--portal-accent); border-radius: 50%; animation: pulse 2s infinite; }
        
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        .portal-content-view {
          flex: 1;
          background: transparent;
          position: relative;
          overflow: hidden;
        }

        .content-scroll-area {
          height: 100%;
          overflow-y: auto;
          padding: 2.5rem;
        }

        @media (max-width: 1024px) {
          .portal-sidebar { display: none; }
          .portal-content-view { width: 100%; }
          .content-scroll-area { padding: 1.5rem; }
        }

        @media (max-width: 768px) {
          .user-details { display: none; }
          .divider-v { display: none; }
          .content-scroll-area { padding: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default CustomerPortal;
