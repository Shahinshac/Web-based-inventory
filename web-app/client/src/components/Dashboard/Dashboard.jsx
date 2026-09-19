import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';

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
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    setCurrentDate(new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(new Date()));
  }, []);

  return (
    <div className="erp-dashboard-view">
      {/* Welcome Banner */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">{greeting}, {currentUser?.username || 'Admin'} 👋</h2>
          <p className="page-subtitle">Business operations and KPI performance overview &bull; {currentDate}</p>
        </div>
        <div className="page-actions">
          {canEdit && (
            <>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('pos')}
              >
                <Icon name="shopping-cart" size={15} />
                <span>New Sale</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={onAddProduct}
              >
                <Icon name="plus" size={15} />
                <span>Add Product</span>
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={onAddCustomer}
              >
                <Icon name="user-plus" size={15} />
                <span>Add Customer</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="kpi-row">
        {/* Total Revenue */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-primary">
            <Icon name="trending-up" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Total Revenue</div>
            <div className="kpi-value tabular">{formatCurrency0(stats.totalRevenue || 0)}</div>
            <div className="kpi-sub">
              <span className="badge badge-success">Cumulative Billing</span>
            </div>
          </div>
        </div>

        {/* Total Sales Transactions */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-success">
            <Icon name="shopping-cart" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Total Transactions</div>
            <div className="kpi-value tabular">{stats.totalSales || 0}</div>
            <div className="kpi-sub">
              <span className="badge badge-primary">Completed Sales</span>
            </div>
          </div>
        </div>

        {/* Active Products */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-info">
            <Icon name="package" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Inventory SKUs</div>
            <div className="kpi-value tabular">{stats.totalProducts || 0}</div>
            <div className="kpi-sub">
              {stats.lowStockCount > 0 ? (
                <span className="badge badge-warning">{stats.lowStockCount} Low Stock</span>
              ) : (
                <span className="badge badge-success">Stock Healthy</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-warning">
            <Icon name="users" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Customer CRM</div>
            <div className="kpi-value tabular">{stats.totalCustomers || 0}</div>
            <div className="kpi-sub">
              <span className="badge badge-gray">Active Profiles</span>
            </div>
          </div>
        </div>

        {/* Active Warranties */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-primary">
            <Icon name="shield" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Warranties</div>
            <div className="kpi-value tabular">{stats.activeWarranties || 0}</div>
            <div className="kpi-sub">
              <button 
                onClick={() => onNavigate('warranty')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Track Coverage &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* EMI Plans */}
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon-info">
            <Icon name="credit-card" size={20} />
          </div>
          <div className="kpi-body">
            <div className="kpi-label">Active EMI Plans</div>
            <div className="kpi-value tabular">{stats.activeEMIPlans || 0}</div>
            <div className="kpi-sub">
              <button 
                onClick={() => onNavigate('emi')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Manage EMIs &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Warnings + Recent Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginTop: '4px' }}>
        {/* Low Stock Alerts */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--warning)' }}>
                <Icon name="alert-triangle" size={18} />
              </div>
              <span className="table-toolbar-title">Low Stock Alerts</span>
            </div>
            <span className="badge badge-warning">
              {lowStockProducts?.length || 0} Items Requiring Reorder
            </span>
            <button 
              className="btn btn-ghost btn-xs" 
              style={{ marginLeft: 'auto' }}
              onClick={() => onNavigate('products')}
            >
              View Inventory &rarr;
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Current Qty</th>
                  <th style={{ textAlign: 'right' }}>Min Threshold</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts && lowStockProducts.length > 0 ? (
                  lowStockProducts.slice(0, 6).map((product, index) => {
                    const isOut = (product.quantity || 0) <= 0;
                    return (
                      <tr key={product.id || index}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{product.category || 'General'}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular">
                          {product.quantity}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="tabular">
                          {product.minStock}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${isOut ? 'badge-danger' : 'badge-warning'}`}>
                            {isOut ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Icon name="check-circle" size={28} style={{ color: 'var(--success)' }} />
                        <span>All inventory levels are sufficient. No low stock warnings.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Operations Activity */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--primary)' }}>
                <Icon name="activity" size={18} />
              </div>
              <span className="table-toolbar-title">Recent Activity Feed</span>
            </div>
          </div>

          <div style={{ padding: '16px 20px', maxHeight: '380px', overflowY: 'auto' }}>
            {recentActivity && recentActivity.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {recentActivity.slice(0, 8).map((activity, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      marginTop: '6px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {activity.text}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }} className="tabular">
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Icon name="info" size={24} style={{ marginBottom: '8px' }} />
                <div>No recent activity recorded yet today.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
