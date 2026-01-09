import React from 'react';
import Icon from '../../Icon';

export default function RoleSelector({ role, onChange, readOnly = false }) {
  const roles = [
    { value: 'admin', label: 'Admin', icon: '👑', description: 'Full access' },
    { value: 'manager', label: 'Manager', icon: '👔', description: 'View profit, edit' },
    { value: 'cashier', label: 'Cashier', icon: '💼', description: 'Sales only' }
  ];

  const currentRole = roles.find(r => r.value === role) || roles[2];

  if (readOnly) {
    return (
      <div className="role-badge">
        <span className="role-icon">{currentRole.icon}</span>
        <span className="role-label">{currentRole.label}</span>
      </div>
    );
  }

  return (
    <div className="role-selector">
      <label className="role-selector-label">
        <Icon name="shield" size={16} />
        User Role
      </label>
      <select 
        value={role}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="role-select"
      >
        {roles.map(r => (
          <option key={r.value} value={r.value}>
            {r.icon} {r.label} - {r.description}
          </option>
        ))}
      </select>
    </div>
  );
}
