import React from 'react';
import Icon from '../../Icon';

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  onClear,
  className = '',
  autoFocus = false
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`search-bar ${className}`}>
      <Icon name="search" className="search-icon" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="search-input"
        autoFocus={autoFocus}
      />
      {value && (
        <button 
          onClick={handleClear}
          className="search-clear-btn"
          aria-label="Clear search"
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}
