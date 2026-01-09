/**
 * @file Icon.jsx
 * @description Comprehensive SVG icon component library
 * Provides a unified interface for rendering icons throughout the application
 * 
 * @author 26:07 Electronics
 * @version 2.0.0
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Icon Component
 * 
 * A flexible SVG icon component that renders various icons based on the provided name.
 * All icons are designed with consistent styling and support customization.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.name - Name of the icon to render
 * @param {number} [props.size=18] - Size of the icon in pixels
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.stroke='currentColor'] - Stroke color (inherits text color by default)
 * @param {string} [props.fill='none'] - Fill color for the icon
 * @param {number} [props.strokeWidth=1.5] - Width of the stroke
 * @returns {React.Element|null} SVG element or null if icon not found
 * 
 * @example
 * // Basic usage
 * <Icon name="dashboard" />
 * 
 * @example
 * // Custom size and color
 * <Icon name="users" size={24} className="text-blue-500" />
 * 
 * @example
 * // With custom stroke
 * <Icon name="add" size={20} stroke="#ff6b6b" strokeWidth={2} />
 */
const Icon = ({ 
  name, 
  size = 18, 
  className = '', 
  stroke = 'currentColor', 
  fill = 'none',
  strokeWidth = 1.5 
}) => {
  // Common SVG properties applied to all icons
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: fill,
    stroke: stroke,
    strokeWidth: strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: className,
  };

  /**
   * Icon definitions organized by category
   */

  // ==================== NAVIGATION ICONS ====================
  
  if (name === 'dashboard') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="4" rx="1" />
        <rect x="14" y="11" width="7" height="10" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (name === 'pos') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M7 8h10" />
        <path d="M7 12h6" />
      </svg>
    );
  }

  if (name === 'products') {
    return (
      <svg {...svgProps}>
        <path d="M12 2l8 4-8 4-8-4 8-4z" />
        <path d="M2 10l10 5 10-5" />
        <path d="M2 17l10 5 10-5" />
      </svg>
    );
  }

  if (name === 'customers') {
    return (
      <svg {...svgProps}>
        <path d="M20 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M4 21v-2a4 4 0 0 1 3-3.87" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === 'invoices') {
    return (
      <svg {...svgProps}>
        <path d="M7 3h10v18H7z" />
        <path d="M7 9h10" />
        <path d="M11 13h2" />
      </svg>
    );
  }

  if (name === 'analytics') {
    return (
      <svg {...svgProps}>
        <path d="M3 3v18h18" />
        <path d="M7 15V8" />
        <path d="M12 15V5" />
        <path d="M17 15v-6" />
      </svg>
    );
  }

  if (name === 'reports') {
    return (
      <svg {...svgProps}>
        <path d="M3 3v18h18" />
        <path d="M8 7h8" />
        <path d="M8 12h8" />
        <path d="M8 17h5" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...svgProps}>
        <path d="M16 11c1.657 0 3 1.343 3 3v4H5v-4c0-1.657 1.343-3 3-3" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  }

  if (name === 'audit') {
    return (
      <svg {...svgProps}>
        <path d="M3 7h18" />
        <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
        <path d="M10 11h4" />
      </svg>
    );
  }

  // ==================== ACTION ICONS ====================

  if (name === 'add') {
    return (
      <svg {...svgProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === 'download') {
    return (
      <svg {...svgProps}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    );
  }

  if (name === 'print') {
    return (
      <svg {...svgProps}>
        <path d="M6 9V2h12v7" />
        <rect x="6" y="13" width="12" height="8" rx="2" />
      </svg>
    );
  }

  if (name === 'trash') {
    return (
      <svg {...svgProps}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    );
  }

  if (name === 'check') {
    return (
      <svg {...svgProps}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  if (name === 'close') {
    return (
      <svg {...svgProps}>
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    );
  }

  if (name === 'eye') {
    return (
      <svg {...svgProps}>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === 'camera') {
    return (
      <svg {...svgProps}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v12z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    );
  }

  if (name === 'door') {
    return (
      <svg {...svgProps}>
        <path d="M3 21h18" />
        <path d="M9 21V10" />
        <path d="M7 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17" />
        <circle cx="15" cy="14" r="1" />
      </svg>
    );
  }

  // ==================== COMMUNICATION ICONS ====================

  if (name === 'whatsapp') {
    return (
      <svg {...svgProps}>
        <path d="M21 15a4 4 0 0 1-3 3c-1 0-2 0-3-.5L9 21l1.5-5c-.3-1-.5-2-.5-3a4 4 0 0 1 4-4h3" />
        <path d="M17 9.5a0.5 0.5 0 1 1-1 0 0.5 0.5 0 0 1 1 0z" />
      </svg>
    );
  }

  if (name === 'email' || name === 'mail') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    );
  }

  if (name === 'phone') {
    return (
      <svg {...svgProps}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.63A2 2 0 0 1 4.09 2h3a2 2 0 0 1 2 1.72c.12 1.21.45 2.4.97 3.5a2 2 0 0 1-.45 2.11L8.91 11.09a16 16 0 0 0 6 6l1.76-1.76a2 2 0 0 1 2.11-.45c1.11.52 2.29.86 3.5.97A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  if (name === 'location') {
    return (
      <svg {...svgProps}>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }

  // ==================== SECURITY ICONS ====================

  if (name === 'lock') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      </svg>
    );
  }

  // ==================== PAYMENT ICONS ====================

  if (name === 'cash') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (name === 'card') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    );
  }

  if (name === 'rupee') {
    return (
      <svg {...svgProps}>
        <path d="M3 7h18" />
        <path d="M3 12h18" />
        <path d="M8 18c1.5 0 2.8-1 3.3-2.4.2-.6.7-1 1.3-1h3" />
        <path d="M12 15c-1.5 0-2.7-1.2-2.7-2.6S10.5 9.8 12 9.8h4" />
      </svg>
    );
  }

  // ==================== BRAND & MISC ICONS ====================

  if (name === 'spark') {
    return (
      <svg {...svgProps}>
        <path d="M12 2l1.8 4.6L19 8l-4.6 1.8L12 14 10.6 9.8 6 8l4.6-1.4L12 2z" />
      </svg>
    );
  }

  // Icon not found
  console.warn(`Icon "${name}" not found`);
  return null;
};

/**
 * PropTypes validation
 */
Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  className: PropTypes.string,
  stroke: PropTypes.string,
  fill: PropTypes.string,
  strokeWidth: PropTypes.number,
};

Icon.defaultProps = {
  size: 18,
  className: '',
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1.5,
};

/**
 * Available icon names for reference
 * @constant {string[]}
 */
export const AVAILABLE_ICONS = [
  // Navigation
  'dashboard', 'pos', 'products', 'customers', 'invoices', 
  'analytics', 'reports', 'users', 'audit',
  // Actions
  'add', 'download', 'print', 'trash', 'check', 'close', 
  'eye', 'camera', 'door',
  // Communication
  'whatsapp', 'email', 'mail', 'phone', 'location',
  // Security
  'lock',
  // Payment
  'cash', 'card', 'rupee',
  // Brand
  'spark',
];

export default Icon;
