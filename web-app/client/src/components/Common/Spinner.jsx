import React from 'react';

export default function Spinner({ size = 'medium', color = 'primary', text = '' }) {
  const sizeClass = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large'
  }[size] || 'spinner-medium';

  const colorClass = {
    primary: 'spinner-primary',
    white: 'spinner-white',
    accent: 'spinner-accent'
  }[color] || 'spinner-primary';

  return (
    <div className="spinner-container">
      <div className={`spinner ${sizeClass} ${colorClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}

// Inline spinner for buttons
export function InlineSpinner({ size = 16 }) {
  return (
    <svg 
      className="inline-spinner" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle 
        className="spinner-circle" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none"
      />
    </svg>
  );
}
