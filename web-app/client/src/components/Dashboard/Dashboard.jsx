import React from 'react';
import StatCard from './StatCard';
import QuickActions from './QuickActions';
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
  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency0(stats.totalRevenue || 0),
      icon: 'dollar-sign',
      color: '#10b981',
      trend: stats.revenueTrend || 0,
      subtitle: 'Overall sales'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts || 0,
      icon: 'package',
      color: '#3b82f6',
      subtitle: `${stats.lowStockCount || 0} low stock`
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers || 0,
      icon: 'users',
      color: '#8b5cf6',
      subtitle: 'Registered customers'
    },
    {
      title: 'Total Invoices',
      value: stats.totalSales || 0,
      icon: 'file-text',
      color: '#f59e0b',
      subtitle: 'Total transactions'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">📊 Dashboard Overview</h2>
        <p className="dashboard-subtitle">Your business at a glance</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {canEdit && (
        <QuickActions 
          onAddProduct={onAddProduct}
          onAddCustomer={onAddCustomer}
          onNavigatePOS={() => onNavigate('pos')}
          onNavigateProducts={() => onNavigate('products')}
        />
      )}

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">
              <Icon name="alert-triangle" size={20} />
              Low Stock Alerts
            </h3>
          </div>
          <div className="low-stock-list">
            {lowStockProducts && lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map(product => (
                <div key={product.id} className="low-stock-item">
                  <div className="low-stock-info">
                    <span className="product-name">{product.name}</span>
                    <span className="product-stock">
                      Stock: {product.quantity} / Min: {product.minStock}
                    </span>
                  </div>
                  <div className="low-stock-badge">
                    {product.quantity === 0 ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : (
                      <span className="badge badge-warning">Low Stock</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Icon name="check-circle" size={48} color="#10b981" />
                <p>All products are well stocked! 🎉</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">
              <Icon name="activity" size={20} />
              Recent Activity
            </h3>
          </div>
          <div className="activity-list">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.slice(0, 8).map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <Icon name={activity.icon || 'circle'} size={16} />
                  </div>
                  <div className="activity-details">
                    <span className="activity-text">{activity.text}</span>
                    <span className="activity-time">{activity.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Icon name="inbox" size={48} color="#94a3b8" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
