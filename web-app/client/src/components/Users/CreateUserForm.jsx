import React, { useState } from 'react';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function CreateUserForm({ onCreateUser, onClose }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('cashier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username and password are required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await onCreateUser({ username, email, password, role });
      if (result?.success) {
        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
        setRole('cashier');
        if (onClose) onClose();
      } else {
        setError(result?.error || 'Failed to create user');
      }
    } catch (err) {
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-user-section">
      <div className="create-user-header">
        <div className="create-user-icon-wrapper">
          <Icon name="add" size={24} />
        </div>
        <div className="create-user-header-text">
          <h3>Create New User</h3>
          <span className="create-user-subtitle">Set up username, password, and role for the new user</span>
        </div>
        {onClose && (
          <button className="create-user-close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="create-user-form">
        <div className="create-user-fields">
          <div className="create-user-field">
            <label htmlFor="new-username">
              <Icon name="user" size={14} />
              Username *
            </label>
            <input
              id="new-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (min 3 chars)"
              required
              minLength="3"
              autoComplete="off"
            />
          </div>

          <div className="create-user-field">
            <label htmlFor="new-email">
              <Icon name="email" size={14} />
              Email (optional)
            </label>
            <input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              autoComplete="off"
            />
          </div>

          <div className="create-user-field">
            <label htmlFor="new-password">
              <Icon name="lock" size={14} />
              Password *
            </label>
            <div className="create-user-password-wrapper">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password (min 6 chars)"
                required
                minLength="6"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? "lock" : "eye"} size={16} />
              </button>
            </div>
          </div>

          <div className="create-user-field">
            <label htmlFor="new-role">
              <Icon name="shield" size={14} />
              Role
            </label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="role-dropdown"
            >
              <option value="cashier">💼 Cashier - Sales only</option>
              <option value="manager">👔 Manager - View profit, edit</option>
              <option value="admin">👑 Admin - Full access</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="create-user-error">
            <Icon name="close" size={14} />
            {error}
          </div>
        )}

        <div className="create-user-actions">
          <Button
            variant="success"
            type="submit"
            disabled={loading || !username || !password}
            icon="check"
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
          {onClose && (
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              icon="x"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
