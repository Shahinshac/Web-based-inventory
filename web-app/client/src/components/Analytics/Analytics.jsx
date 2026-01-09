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

  return (
    <div className="analytics">
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">📊 Analytics</h2>
          <p className="analytics-subtitle">Business insights and trends</p>
        </div>
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

      <div className="analytics-summary">
        <div className="summary-card">
          <Icon name="trending-up" size={32} color="#10b981" />
          <div>
            <h4>Total Revenue</h4>
            <p className="summary-value">{formatCurrency0(revenueSummary.totalRevenue || 0)}</p>
          </div>
        </div>
        
        {canViewProfit && (
          <div className="summary-card">
            <Icon name="dollar-sign" size={32} color="#3b82f6" />
            <div>
              <h4>Total Profit</h4>
              <p className="summary-value">{formatCurrency0(revenueSummary.totalProfit || 0)}</p>
            </div>
          </div>
        )}
        
        <div className="summary-card">
          <Icon name="shopping-cart" size={32} color="#f59e0b" />
          <div>
            <h4>Total Sales</h4>
            <p className="summary-value">{revenueSummary.totalSales || 0}</p>
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
            Low Stock Alerts
          </h3>
          <div className="low-stock-grid">
            {lowStock.slice(0, 6).map(product => (
              <div key={product.id} className="low-stock-item">
                <span className="product-name">{product.name}</span>
                <span className="stock-level">{product.quantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
