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

  const handleInternalChange = (e) => {
    if (!onChange) return;
    if (type === 'number') {
      let val = e.target.value;
      if (val !== '') {
        // Strip unintentional leading zeros (e.g. "0005" -> "5", "05" -> "5"), but preserve "0" and decimals like "0.5"
        if (/^0[0-9]+/.test(val)) {
          val = val.replace(/^0+/, '') || '0';
          e.target.value = val;
        }
        // If min is >= 0, prevent negative numbers
        if (min !== undefined && Number(min) >= 0 && val.startsWith('-')) {
          val = val.replace(/^-+/, '');
          e.target.value = val;
        }
      }
    }
    onChange(e);
  };

  const handleInternalBlur = (e) => {
    if (type === 'number') {
      let val = e.target.value;
      if (val !== '' && !isNaN(val)) {
        if (/^0[0-9]+/.test(val)) {
          val = String(Number(val));
          e.target.value = val;
          if (onChange) onChange(e);
        }
      }
    }
    if (props.onBlur) props.onBlur(e);
  };

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
        onChange={handleInternalChange}
        onBlur={handleInternalBlur}
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
