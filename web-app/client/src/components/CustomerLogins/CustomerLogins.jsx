import React, { useState, useEffect } from 'react';
import Icon from '../../Icon';
import Button from '../Common/Button';
import SearchBar from '../Common/SearchBar';
import { apiGet, apiPost, API, getErrorMessage } from '../../utils/api';
import { formatTimestampIST } from '../../utils/dateFormatter';

export default function CustomerLogins({ showNotification }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCustomers = async () => {
    try {
      setIsRefreshing(true);
      const data = await apiGet('/api/customer-auth/admin/list');
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      showNotification(getErrorMessage(error), 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleResetPassword = async (customerId, customerName) => {
    const newPassword = prompt(`Enter new password for ${customerName} (min 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      await apiPost('/api/customer-auth/admin/reset-password', { customerId, newPassword });
      showNotification(`✅ Password reset successfully for ${customerName}`, 'success');
      fetchCustomers();
    } catch (error) {
      showNotification(getErrorMessage(error), 'error');
    }
  };

  const handleDeleteAccount = async (customerId, customerName) => {
    if (!confirm(`Are you sure you want to remove login access for ${customerName}? They will need to register again to access the portal.`)) {
      return;
    }

    try {
      await apiPost('/api/customer-auth/admin/delete-account', { customerId });
      showNotification(`✅ Login access removed for ${customerName}`, 'success');
      fetchCustomers();
    } catch (error) {
      showNotification(getErrorMessage(error), 'error');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  return (
    <div className="customer-logins-page page-full-width">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="key" size={22} style={{ color: 'var(--primary)' }} />
            Customer Portal Access Management
          </h1>
          <p className="page-subtitle">
            Manage customer login accounts, reset passwords, and configure access permissions for the Customer Portal
          </p>
        </div>
        <div className="page-actions">
          <Button 
            variant="secondary" 
            onClick={fetchCustomers} 
            icon="refresh-cw" 
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh List'}
          </Button>
        </div>
      </div>

      <div className="table-toolbar" style={{ marginBottom: '16px' }}>
        <div style={{ flex: '1', maxWidth: '400px' }}>
          <SearchBar 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email or phone..."
          />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {filteredCustomers.length} registered profiles
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Icon name="loader" size={36} className="spin" style={{ color: 'var(--primary)' }} />
          <p style={{ marginTop: '14px', color: 'var(--text-muted)' }}>Loading customer accounts...</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email Address</th>
                  <th>Portal Status</th>
                  <th>Last Login (IST)</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customer.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📞 {customer.phone}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{customer.email}</td>
                      <td>
                        {customer.hasAccount ? (
                          <span className="badge badge-success">
                            ● Account Active
                          </span>
                        ) : (
                          <span className="badge badge-default">
                            ○ No Portal Account
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                        {customer.lastLogin ? formatTimestampIST(customer.lastLogin) : 'Never'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button 
                            size="small" 
                            variant="primary" 
                            onClick={() => handleResetPassword(customer.id, customer.name)}
                            icon="key"
                            title="Reset customer password"
                          >
                            Reset
                          </Button>
                          {customer.hasAccount && (
                            <Button 
                              size="small" 
                              variant="danger" 
                              onClick={() => handleDeleteAccount(customer.id, customer.name)}
                              icon="user-minus"
                              title="Remove login access"
                            >
                              Disable
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state" style={{ padding: '48px 20px' }}>
                        <Icon name="search" size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>No customers found matching your search</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
