import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { formatCurrency, formatCurrency0 } from '../../constants';

export default function Dashboard({ 
  stats, 
  recentActivity,
  lowStockProducts,
  onNavigate,
  onAddProduct,
  onAddCustomer,
  canEdit
}) {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickStats = [
    {
      title: 'Total Revenue',
      value: formatCurrency0(stats.totalRevenue || 0),
      icon: 'trending-up',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: 'Products',
      value: stats.totalProducts || 0,
      icon: 'package',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      subtitle: `${stats.lowStockCount || 0} low stock`
    },
    {
      title: 'Customers',
      value: stats.totalCustomers || 0,
      icon: 'users',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      subtitle: 'Active customers'
    },
    {
      title: 'Sales Today',
      value: stats.totalSales || 0,
      icon: 'shopping-cart',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      subtitle: 'Transactions'
    }
  ];

  return (
    <div className="modern-dashboard">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div className="welcome-content">
          <div className="welcome-text">
            <span className="welcome-greeting">{greeting}! 👋</span>
            <h1 className="welcome-title">Dashboard Overview</h1>
            <p className="welcome-subtitle">Here's what's happening with your business today</p>
          </div>
          <div className="welcome-date">
            <div className="date-display">
              <Icon name="calendar" size={20} />
              <span>{currentTime.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
        {quickStats.map((stat, index) => (
          <div key={index} className="modern-stat-card" style={{ '--card-gradient': stat.gradient }}>
            <div className="stat-card-bg"></div>
            <div className="stat-card-content">
              <div className="stat-icon-wrap">
                <Icon name={stat.icon} size={24} />
              </div>
              <div className="stat-info">
                <span className="stat-label">{stat.title}</span>
                <span className="stat-value">{stat.value}</span>
                {stat.change && (
                  <span className={`stat-change ${stat.changeType}`}>
                    <Icon name="arrow-up" size={14} />
                    {stat.change}
                  </span>
                )}
                {stat.subtitle && <span className="stat-subtitle">{stat.subtitle}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {canEdit && (
        <div className="quick-actions-section">
          <h2 className="section-heading">
            <Icon name="zap" size={20} />
            Quick Actions
          </h2>
          <div className="quick-actions-grid">
            <button className="action-card" onClick={() => onNavigate('pos')}>
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <Icon name="shopping-cart" size={24} />
              </div>
              <span className="action-label">New Sale</span>
              <span className="action-shortcut">F2</span>
            </button>
            <button className="action-card" onClick={onAddProduct}>
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <Icon name="plus" size={24} />
              </div>
              <span className="action-label">Add Product</span>
              <span className="action-shortcut">Ctrl+N</span>
            </button>
            <button className="action-card" onClick={onAddCustomer}>
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <Icon name="user-plus" size={24} />
              </div>
              <span className="action-label">Add Customer</span>
              <span className="action-shortcut">Ctrl+K</span>
            </button>
            <button className="action-card" onClick={() => onNavigate('products')}>
              <div className="action-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <Icon name="package" size={24} />
              </div>
              <span className="action-label">View Products</span>
              <span className="action-shortcut">F3</span>
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="dashboard-grid">
        {/* Low Stock Alerts */}
        <div className="dashboard-card alerts-card">
          <div className="card-header">
            <div className="card-title">
              <Icon name="alert-triangle" size={20} />
              <span>Low Stock Alerts</span>
            </div>
            <span className="card-badge">{lowStockProducts?.length || 0}</span>
          </div>
          <div className="card-body">
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="alert-list">
                {lowStockProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id || index} className="alert-item">
                    <div className="alert-product">
                      <div className="product-avatar">
                        <Icon name="package" size={16} />
                      </div>
                      <div className="product-details">
                        <span className="product-name">{product.name}</span>
                        <span className="product-meta">
                          Stock: <strong>{product.quantity}</strong> / Min: {product.minStock}
                        </span>
                      </div>
                    </div>
                    <span className={`status-badge ${product.quantity === 0 ? 'danger' : 'warning'}`}>
                      {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon success">
                  <Icon name="check-circle" size={48} />
                </div>
                <h4>All Stocked Up! 🎉</h4>
                <p>All products are well stocked</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card activity-card">
          <div className="card-header">
            <div className="card-title">
              <Icon name="activity" size={20} />
              <span>Recent Activity</span>
            </div>
            <button className="card-action">View All</button>
          </div>
          <div className="card-body">
            {recentActivity && recentActivity.length > 0 ? (
              <div className="activity-timeline">
                {recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-text">{activity.text}</span>
                      <span className="timeline-time">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Icon name="inbox" size={48} />
                </div>
                <h4>No Recent Activity</h4>
                <p>Start making sales to see activity here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
