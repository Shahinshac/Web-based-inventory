import React from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';

export default function QuickActions({ 
  onAddProduct, 
  onAddCustomer, 
  onNavigatePOS,
  onNavigateProducts 
}) {
  const actions = [
    {
      label: 'New Sale',
      icon: 'shopping-cart',
      color: '#10b981',
      onClick: onNavigatePOS,
      shortcut: 'F2'
    },
    {
      label: 'Add Product',
      icon: 'plus-circle',
      color: '#3b82f6',
      onClick: onAddProduct,
      shortcut: 'Ctrl+N'
    },
    {
      label: 'Add Customer',
      icon: 'user-plus',
      color: '#8b5cf6',
      onClick: onAddCustomer,
      shortcut: 'Ctrl+K'
    },
    {
      label: 'View Products',
      icon: 'package',
      color: '#f59e0b',
      onClick: onNavigateProducts,
      shortcut: 'F3'
    }
  ];

  return (
    <div className="quick-actions">
      <h3 className="quick-actions-title">⚡ Quick Actions</h3>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <button
            key={index}
            className="quick-action-btn"
            onClick={action.onClick}
            title={`${action.label} (${action.shortcut})`}
            style={{ '--action-color': action.color }}
          >
            <div className="quick-action-icon" style={{ backgroundColor: `${action.color}20`, color: action.color }}>
              <Icon name={action.icon} size={24} />
            </div>
            <div className="quick-action-content">
              <span className="quick-action-label">{action.label}</span>
              <span className="quick-action-shortcut">{action.shortcut}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
