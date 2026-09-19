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
    <div className="modern-dashboard" style={{ padding: '0' }}>
      {/* Welcome Section */}
      <div className="dashboard-welcome" style={{ marginBottom: '24px' }}>
        <div className="welcome-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div className="welcome-text">
            <h1 className="welcome-title" style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>{greeting}! 👋</h1>
            <p className="welcome-subtitle" style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748b)', marginTop: '4px', margin: 0 }}>Here's an overview of your business operations today.</p>
          </div>
          <div className="welcome-date" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Live Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', padding: '7px 12px', borderRadius: '8px', color: 'var(--primary, #4f46e5)', fontWeight: 600, fontSize: '13px', fontVariantNumeric: 'tabular-nums', boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' }}>
              <Icon name="clock" size={14} />
              <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <div className="date-display" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', padding: '7px 12px', borderRadius: '8px', color: 'var(--text-secondary, #334155)', fontWeight: 500, fontSize: '13px', boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' }}>
              <Icon name="calendar" size={14} />
              <span>{currentTime.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bento-dashboard">
        {/* Total Revenue Bento */}
        <div className="bento-card bento-col-2">
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="trending-up" size={16} /></div>
            Total Revenue
          </div>
          <div className="bento-number">
            {formatCurrency0(stats.totalRevenue || 0)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: 'var(--success, #059669)', fontWeight: 600 }}>
            <Icon name="arrow-up-right" size={14} />
            <span>Cumulative Sales & Invoices</span>
          </div>
        </div>

        {/* Sales Bento */}
        <div className="bento-card">
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="shopping-cart" size={16} /></div>
            Total Sales
          </div>
          <div className="bento-number">{stats.totalSales || 0}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>All completed transactions</div>
        </div>

        {/* Customers Bento */}
        <div className="bento-card">
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="users" size={16} /></div>
            Customers
          </div>
          <div className="bento-number">{stats.totalCustomers || 0}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Active customer records</div>
        </div>

        {/* Low Stock Alerts Bento */}
        <div className="bento-card bento-col-2 bento-row-2">
          <div className="bento-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="bento-title-icon" style={{ color: 'var(--danger, #dc2626)' }}><Icon name="alert-triangle" size={16} /></div>
              Low Stock Alerts
            </div>
            <span style={{ background: 'var(--danger-subtle, #fef2f2)', color: 'var(--danger, #dc2626)', border: '1px solid var(--danger-border, #fecaca)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{lowStockProducts?.length || 0} items</span>
          </div>
          <div className="card-body" style={{ marginTop: '14px' }}>
            {lowStockProducts && lowStockProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lowStockProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border, #e2e8f0)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ padding: '6px', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '6px', color: 'var(--primary, #4f46e5)' }}><Icon name="package" size={15} /></div>
                      <div>
                        <div style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600, fontSize: '13px' }}>{product.name}</div>
                        <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '2px' }}>Stock: {product.quantity} / Min: {product.minStock}</div>
                      </div>
                    </div>
                    <span style={{ color: product.quantity === 0 ? 'var(--danger, #dc2626)' : 'var(--warning, #d97706)', fontSize: '11px', fontWeight: 600, padding: '3px 8px', background: product.quantity === 0 ? 'var(--danger-subtle, #fef2f2)' : 'var(--warning-subtle, #fffbeb)', border: `1px solid ${product.quantity === 0 ? 'var(--danger-border, #fecaca)' : 'var(--warning-border, #fde68a)'}`, borderRadius: '6px' }}>
                      {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted, #64748b)', padding: '32px 0', fontSize: '13px' }}>All products are well stocked! 🎉</div>
            )}
          </div>
        </div>

        {/* Active Warranties Bento */}
        <div className="bento-card bento-col-2">
          <div className="bento-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="bento-title-icon" style={{ color: 'var(--success, #059669)' }}><Icon name="shield" size={16} /></div>
              Active Warranties
            </div>
            <button className="text-primary" style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--primary, #4f46e5)' }} onClick={() => onNavigate('warranty')}>View All →</button>
          </div>
          <div className="card-body" style={{ marginTop: '12px' }}>
            {stats.activeWarranties > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success, #059669)', fontVariantNumeric: 'tabular-nums' }}>{stats.activeWarranties}</div>
                <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>Currently protecting products</div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '12.5px' }}>No active warranties</div>
            )}
          </div>
        </div>

        {/* EMI Plans Bento */}
        <div className="bento-card bento-col-2">
          <div className="bento-title" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="bento-title-icon" style={{ color: 'var(--primary, #4f46e5)' }}><Icon name="credit-card" size={16} /></div>
              EMI Plans
            </div>
            <button className="text-primary" style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--primary, #4f46e5)' }} onClick={() => onNavigate('emi')}>Manage →</button>
          </div>
          <div className="card-body" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary, #4f46e5)', fontVariantNumeric: 'tabular-nums' }}>{stats.activeEMIPlans || 0}</div>
              <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>Active installment schedules</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Bento */}
        <div className="bento-card bento-col-2 bento-row-2">
          <div className="bento-title">
            <div className="bento-title-icon"><Icon name="activity" size={16} /></div>
            Recent Activity
          </div>
          <div className="card-body" style={{ marginTop: '14px' }}>
            {recentActivity && recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentActivity.slice(0, 6).map((activity, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary, #4f46e5)', marginTop: '6px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary, #0f172a)', fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>{activity.text}</div>
                      <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px', marginTop: '2px' }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted, #64748b)', padding: '32px 0', fontSize: '13px' }}>No recent activity to display.</div>
            )}
          </div>
        </div>

        {/* Quick Actions Bento */}
        {canEdit && (
          <div className="bento-card bento-col-4">
            <div className="bento-title">
              <div className="bento-title-icon"><Icon name="zap" size={16} /></div>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
              {[
                { label: 'New Sale', icon: 'shopping-cart', onClick: () => onNavigate('pos'), color: '#4f46e5' },
                { label: 'Add Product', icon: 'plus', onClick: onAddProduct, color: '#059669' },
                { label: 'Add Customer', icon: 'user-plus', onClick: onAddCustomer, color: '#0284c7' },
                { label: 'View Products', icon: 'package', onClick: () => onNavigate('products'), color: '#7c3aed' }
              ].map((action, i) => (
                <button 
                  key={i} 
                  onClick={action.onClick}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '10px', 
                    padding: '12px 16px', background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', 
                    borderRadius: '8px', cursor: 'pointer', transition: 'border-color 150ms ease, box-shadow 150ms ease', color: 'var(--text-primary, #0f172a)', fontWeight: 600,
                    fontSize: '13px', textAlign: 'left',
                    boxShadow: 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.08))' }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border, #e2e8f0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs, 0 1px 2px rgba(0,0,0,0.05))' }}
                >
                  <div style={{ background: action.color, color: 'white', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={action.icon} size={16} />
                  </div>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
