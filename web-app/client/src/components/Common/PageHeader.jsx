import React from 'react';
import Icon from '../../Icon';

/**
 * Reusable PageHeader Component
 * Provides consistent header layout across all pages
 * 
 * @param {string} title - Main page title
 * @param {string} subtitle - Optional subtitle/description
 * @param {string} icon - Icon name from Icon component
 * @param {string} iconGradient - CSS gradient for icon background
 * @param {ReactNode} actions - Optional action buttons/elements
 */
export default function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  iconGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  actions,
  children
}) {
  return (
    <div className="global-page-header">
      <div className="global-page-header-content">
        {icon && (
          <div 
            className="global-page-header-icon" 
            style={{ background: iconGradient }}
          >
            <Icon name={icon} size={28} />
          </div>
        )}
        <div className="global-page-header-text">
          <h1 className="global-page-title">{title}</h1>
          {subtitle && <p className="global-page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {(actions || children) && (
        <div className="global-page-header-actions">
          {actions || children}
        </div>
      )}
    </div>
  );
}
