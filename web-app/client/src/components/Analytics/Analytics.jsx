import React from 'react';
import RevenueChart from './RevenueChart';
import TopProductsChart from './TopProductsChart';
import ProfitChart from './ProfitChart';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';

export default function Analytics({ 
  analyticsData, 
  dateRange, 
  onDateRangeChange,
  canViewProfit
}) {
  const { topProducts, lowStock, revenueSummary } = analyticsData;

  const avgOrderValue = revenueSummary.totalSales > 0 
    ? Math.round(revenueSummary.totalRevenue / revenueSummary.totalSales) 
    : 0;

  return (
    <div className="analytics">
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">
            <Icon name="bar-chart-2" size={24} />
            Analytics
          </h2>
          <p className="analytics-subtitle">Business insights and performance trends</p>
        </div>
        <div className="analytics-header-actions">
          <select 
            value={dateRange}
            onChange={(e) => onDateRangeChange(parseInt(e.target.value))}
            className="date-range-select"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      </div>

      <div className="analytics-summary">
        <div className="summary-card revenue-card">
          <div className="summary-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Icon name="trending-up" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Total Revenue</span>
            <p className="summary-value">{formatCurrency0(revenueSummary.totalRevenue || 0)}</p>
          </div>
        </div>
        
        {canViewProfit && (
          <div className="summary-card profit-card">
            <div className="summary-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Icon name="dollar-sign" size={24} />
            </div>
            <div className="summary-card-content">
              <span className="summary-card-label">Total Profit</span>
              <p className="summary-value">{formatCurrency0(revenueSummary.totalProfit || 0)}</p>
            </div>
          </div>
        )}
        
        <div className="summary-card sales-card">
          <div className="summary-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Icon name="shopping-cart" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Total Sales</span>
            <p className="summary-value">{revenueSummary.totalSales || 0}</p>
          </div>
        </div>

        <div className="summary-card avg-card">
          <div className="summary-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Icon name="target" size={24} />
          </div>
          <div className="summary-card-content">
            <span className="summary-card-label">Avg Order Value</span>
            <p className="summary-value">{formatCurrency0(avgOrderValue)}</p>
          </div>
        </div>
      </div>

      <div className="analytics-charts">
        <RevenueChart data={revenueSummary.dailyData || []} />
        
        {canViewProfit && (
          <ProfitChart data={revenueSummary.dailyData || []} />
        )}
        
        <TopProductsChart products={topProducts || []} />
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="analytics-section">
          <h3 className="section-title">
            <Icon name="alert-triangle" size={20} />
            Low Stock Alerts ({lowStock.length})
          </h3>
          <div className="low-stock-grid">
            {lowStock.slice(0, 8).map((product, index) => (
              <div key={index} className="low-stock-item">
                <div className="low-stock-info">
                  <span className="product-name">{product.name}</span>
                  <span className="low-stock-min">Min: {product.minStock || 'N/A'}</span>
                </div>
                <span className={`stock-level ${product.currentStock === 0 ? 'out' : ''}`}>
                  {product.currentStock} left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
