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
    <div className="customer-logins-container" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="key" size={24} color="#6366f1" />
            Customer Login Management
          </h2>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Control customer access and reset passwords for the Customer Portal</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={fetchCustomers} 
          icon="refresh-cw" 
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh List'}
        </Button>
      </div>

      <div style={{ marginBottom: '20px', maxWidth: '500px' }}>
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email or phone..."
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Icon name="loader" size={40} className="spin" color="#6366f1" />
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading customer accounts...</p>
        </div>
      ) : (
        <div className="premium-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>Customer Name</th>
                  <th style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>Account Status</th>
                  <th style={{ padding: '16px', color: '#64748b', fontWeight: 600 }}>Last Login (IST)</th>
                  <th style={{ padding: '16px', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{customer.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {customer.phone}</div>
                      </td>
                      <td style={{ padding: '16px', color: '#334155' }}>{customer.email}</td>
                      <td style={{ padding: '16px' }}>
                        {customer.hasAccount ? (
                          <span style={{ 
                            background: '#ecfdf5', color: '#059669', 
                            padding: '4px 10px', borderRadius: '12px', 
                            fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            Account Active
                          </span>
                        ) : (
                          <span style={{ 
                            background: '#f1f5f9', color: '#64748b', 
                            padding: '4px 10px', borderRadius: '12px', 
                            fontSize: '12px', fontWeight: 500
                          }}>
                            No Portal Account
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                        {customer.lastLogin ? formatTimestampIST(customer.lastLogin) : 'Never'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
                    <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                      <Icon name="search" size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                      <p>No customers found matching your search</p>
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
