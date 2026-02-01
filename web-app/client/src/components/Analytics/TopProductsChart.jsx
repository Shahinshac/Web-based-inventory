import React from 'react';

export default function TopProductsChart({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Top Selling Products</h3>
        <div className="chart-empty">No data available</div>
      </div>
    );
  }

  const maxSold = Math.max(...products.map(p => p.quantity || 0), 1);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top Selling Products</h3>
      <div className="horizontal-bar-chart">
        {products.map((product, index) => {
          const width = ((product.quantity || 0) / maxSold) * 100;
          return (
            <div key={index} className="horizontal-bar-wrapper">
              <div className="product-label">{product.name}</div>
              <div className="horizontal-bar-container">
                <div 
                  className="horizontal-bar"
                  style={{ width: `${width}%` }}
                >
                  <span className="bar-value">{product.quantity} sold</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
