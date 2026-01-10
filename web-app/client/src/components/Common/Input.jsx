import React from 'react';

export default function Input({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false,
  disabled = false,
  min,
  max,
  step,
  className = '',
  error,
  helperText,
  size = 'large',
  fullWidth = false,
  ...props 
}) {
  const inputId = `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  const sizeClass = size ? `input-field--${size}` : '';
  const fullClass = fullWidth ? 'input-field--full' : '';
  const errorClass = error ? 'input-error' : '';

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required-marker">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`input-field ${sizeClass} ${fullClass} ${errorClass}`}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span className="error-message">{error}</span>}
      {helperText && !error && <span className="helper-text">{helperText}</span>}
    </div>
  );
}
