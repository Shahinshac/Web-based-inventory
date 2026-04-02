import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import { formatCurrency, formatCurrency0 } from '../../constants';
import { API, getAuthHeaders } from '../../utils/api';

export default function Dashboard({
  stats,
  recentActivity,
  lowStockProducts,
  onNavigate,
  onAddProduct,
  onAddCustomer,
  canEdit,
  isAdmin,
  currentUser
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
      title: 'Total Sales',
      value: stats.totalSales || 0,
      icon: 'shopping-cart',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      subtitle: 'All transactions'
    }
  ];

  return (
    <div className="modern-dashboard" style={{ padding: '0 16px' }}>
      {/* Welcome Section */}
      <div className="dashboard-welcome" style={{ marginBottom: '32px' }}>
        <div className="welcome-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="welcome-text">
            <h1 className="welcome-title" style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#1e293b' }}>{greeting}! 👋</h1>
            <p className="welcome-subtitle" style={{ fontSize: '16px', color: '#64748b', marginTop: '8px' }}>Here's what's happening today</p>
          </div>
          <div className="welcome-date" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '10px 16px', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '15px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              <Icon name="clock" size={18} />
              <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <div className="date-display" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px 16px', borderRadius: '12px', color: '#1e293b', fontWeight: 600 }}>
              <Icon name="calendar" size={18} />
              <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-dashboard">
        {/* Total Revenue Bento */}
        <div className="bento-card bento-col-2" style={{ '--bento-glow': 'rgba(99, 102, 241, 0.2)' }}>
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="trending-up" size={16} /></div>
            Total Revenue
          </div>
          <div className="bento-number" style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatCurrency0(stats.totalRevenue || 0)}
          </div>
          <div className="bento-sparkline" style={{ marginTop: '24px', height: '40px', background: 'linear-gradient(90deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.3) 100%)', borderRadius: '8px' }}></div>
        </div>

        {/* Sales Bento */}
        <div className="bento-card" style={{ '--bento-glow': 'rgba(52, 211, 153, 0.2)' }}>
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="shopping-cart" size={16} /></div>
            Total Sales
          </div>
          <div className="bento-number">{stats.totalSales || 0}</div>
        </div>

        {/* Customers Bento */}
        <div className="bento-card" style={{ '--bento-glow': 'rgba(56, 189, 248, 0.2)' }}>
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="users" size={16} /></div>
            Customers
          </div>
          <div className="bento-number">{stats.totalCustomers || 0}</div>
        </div>

        {/* Low Stock Alerts Bento */}
        <div className="bento-card bento-col-2 bento-row-2" style={{ '--bento-glow': 'rgba(244, 63, 94, 0.15)' }}>
          <div className="bento-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div className="bento-title-icon" style={{ color: '#f43f5e' }}><Icon name="alert-triangle" size={16} /></div>
              Low Stock Alerts
            </div>
            <span style={{ background: '#f43f5e', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '12px' }}>{lowStockProducts?.length || 0} items</span>
          </div>
          <div className="card-body" style={{ marginTop: '16px' }}>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lowStockProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}><Icon name="package" size={16} /></div>
                      <div>
                        <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '14px' }}>{product.name}</div>
                        <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Stock: {product.quantity} / Min: {product.minStock}</div>
                      </div>
                    </div>
                    <span style={{ color: product.quantity === 0 ? '#ef4444' : '#d97706', fontSize: '12px', fontWeight: 600, padding: '4px 8px', background: product.quantity === 0 ? '#fee2e2' : '#fef3c7', borderRadius: '6px' }}>
                      {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>All products are well stocked! 🎉</div>
            )}
          </div>
        </div>

        {/* Recent Activity Bento */}
        <div className="bento-card bento-col-2 bento-row-2" style={{ '--bento-glow': 'rgba(168, 85, 247, 0.15)' }}>
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="activity" size={16} /></div>
            Recent Activity
          </div>
          <div className="card-body" style={{ marginTop: '16px' }}>
            {recentActivity && recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', marginTop: '6px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: 500, lineHeight: '1.5' }}>{activity.text}</div>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', fontWeight: 400 }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>No recent activity to display.</div>
            )}
          </div>
        </div>

        {/* Quick Actions Bento */}
        {canEdit && (
          <div className="bento-card bento-col-4" style={{ '--bento-glow': 'rgba(255, 255, 255, 0.1)' }}>
            <div className="bento-title">
              <div className="bento-title-icon"><Icon name="zap" size={16} /></div>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '16px' }}>
              {[
                { label: 'New Sale', icon: 'shopping-cart', onClick: () => onNavigate('pos'), color: '#6366f1' },
                { label: 'Add Product', icon: 'plus', onClick: onAddProduct, color: '#ec4899' },
                { label: 'Add Customer', icon: 'user-plus', onClick: onAddCustomer, color: '#0ea5e9' },
                { label: 'View Products', icon: 'package', onClick: () => onNavigate('products'), color: '#10b981' }
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={action.onClick}
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', 
                    padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', 
                    borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s ease', color: '#1e293b', fontWeight: 600
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = `rgba(${action.color.replace('#', '')}, 0.1)`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ background: action.color, color: 'white', padding: '12px', borderRadius: '12px', boxShadow: `0 4px 12px ${action.color}40` }}>
                    <Icon name={action.icon} size={24} />
                  </div>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
