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

  // ==================== ADDITIONAL ICONS ====================

  if (name === 'layers') {
    return (
      <svg {...svgProps}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }

  if (name === 'activity') {
    return (
      <svg {...svgProps}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }

  if (name === 'alert-triangle') {
    return (
      <svg {...svgProps}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (name === 'x-circle') {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  if (name === 'refresh') {
    return (
      <svg {...svgProps}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg {...svgProps}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    );
  }

  if (name === 'inbox') {
    return (
      <svg {...svgProps}>
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    );
  }

  if (name === 'user') {
    return (
      <svg {...svgProps}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg {...svgProps}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }

  if (name === 'plus') {
    return (
      <svg {...svgProps}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  if (name === 'minus') {
    return (
      <svg {...svgProps}>
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }

  if (name === 'file-text') {
    return (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    );
  }

  if (name === 'bar-chart-2') {
    return (
      <svg {...svgProps}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    );
  }

  if (name === 'check-circle') {
    return (
      <svg {...svgProps}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }

  if (name === 'shopping-cart') {
    return (
      <svg {...svgProps}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    );
  }

  if (name === 'trending-up') {
    return (
      <svg {...svgProps}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    );
  }

  if (name === 'package') {
    return (
      <svg {...svgProps}>
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    );
  }

  if (name === 'clock') {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }

  if (name === 'wifi') {
    return (
      <svg {...svgProps}>
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    );
  }

  if (name === 'wifi-off') {
    return (
      <svg {...svgProps}>
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    );
  }

  if (name === 'chevron-up') {
    return (
      <svg {...svgProps}>
        <polyline points="18 15 12 9 6 15" />
      </svg>
    );
  }

  if (name === 'chevron-down') {
    return (
      <svg {...svgProps}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
  }

  if (name === 'settings') {
    return (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }

  if (name === 'log-out') {
    return (
      <svg {...svgProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }

  if (name === 'calendar') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }

  if (name === 'zap') {
    return (
      <svg {...svgProps}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }

  if (name === 'user-plus') {
    return (
      <svg {...svgProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    );
  }

  if (name === 'arrow-up') {
    return (
      <svg {...svgProps}>
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    );
  }

  if (name === 'layout') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    );
  }

  // ==================== CODE/BARCODE ICONS ====================

  if (name === 'barcode') {
    return (
      <svg {...svgProps}>
        <path d="M3 5v14" strokeWidth="2" />
        <path d="M6 5v14" />
        <path d="M9 5v14" strokeWidth="3" />
        <path d="M13 5v14" />
        <path d="M16 5v14" strokeWidth="2" />
        <path d="M19 5v14" />
        <path d="M21 5v14" strokeWidth="2" />
      </svg>
    );
  }

  if (name === 'qr-code' || name === 'qrcode') {
    return (
      <svg {...svgProps}>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <path d="M15 15h2v2h-2z" fill="currentColor" />
        <path d="M19 15h2v2h-2z" fill="currentColor" />
        <path d="M15 19h2v2h-2z" fill="currentColor" />
        <path d="M19 19h2v2h-2z" fill="currentColor" />
        <path d="M17 17h2v2h-2z" fill="currentColor" />
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
  // Code/Barcode
  'barcode', 'qr-code', 'qrcode',
  // Brand
  'spark',
];

export default Icon;
