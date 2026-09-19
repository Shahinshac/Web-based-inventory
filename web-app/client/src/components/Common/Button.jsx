/**
 * Button Component
 * Reusable button styled with modern design-system tokens
 */

import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../Icon';

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  icon,
  className = '',
  style = {},
  ...rest
}) {
  const sizeClass = size === 'small' ? 'btn-sm' : size === 'large' ? 'btn-lg' : 'btn-md';
  const variantClass = `btn-${variant}`;
  const iconSize = size === 'small' ? 14 : size === 'large' ? 18 : 15;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        width: fullWidth ? '100%' : undefined,
        ...style
      }}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : icon ? (
        <Icon name={icon} size={iconSize} />
      ) : null}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'outline', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  icon: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object
};
