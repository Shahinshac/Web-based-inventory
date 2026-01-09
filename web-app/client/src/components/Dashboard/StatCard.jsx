import React from 'react';
import Icon from '../../Icon';

export default function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  trend, 
  subtitle 
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const isPositiveTrend = trend > 0;
  const isNegativeTrend = trend < 0;

  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon" style={{ backgroundColor: `${color}20`, color }}>
          <Icon name={icon} size={24} />
        </div>
        {hasTrend && (
          <div className={`stat-trend ${isPositiveTrend ? 'positive' : isNegativeTrend ? 'negative' : 'neutral'}`}>
            <Icon 
              name={isPositiveTrend ? 'trending-up' : isNegativeTrend ? 'trending-down' : 'minus'} 
              size={16} 
            />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="stat-body">
        <h3 className="stat-title">{title}</h3>
        <div className="stat-value">{value}</div>
        {subtitle && <p className="stat-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
