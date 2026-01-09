import React from 'react';
import { formatCurrency0 } from '../../constants';

export default function ProfitChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Profit Trend</h3>
        <div className="chart-empty">No data available</div>
      </div>
    );
  }

  const maxProfit = Math.max(...data.map(d => d.profit || 0), 1);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Profit Trend</h3>
      <div className="bar-chart">
        {data.map((item, index) => {
          const height = ((item.profit || 0) / maxProfit) * 100;
          return (
            <div key={index} className="bar-wrapper">
              <div 
                className="bar profit-bar"
                style={{ height: `${height}%` }}
                title={formatCurrency0(item.profit || 0)}
              >
                <span className="bar-value">{formatCurrency0(item.profit || 0)}</span>
              </div>
              <div className="bar-label">{item.date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
