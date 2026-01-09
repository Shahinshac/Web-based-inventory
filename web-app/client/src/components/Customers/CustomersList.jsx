import React, { useState } from 'react';
import CustomerCard from './CustomerCard';
import CustomerForm from './CustomerForm';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import Icon from '../../Icon';

export default function CustomersList({ 
  customers, 
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onViewHistory,
  canEdit,
  canDelete
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.place?.toLowerCase().includes(query) ||
      customer.gstin?.toLowerCase().includes(query)
    );
  });

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowAddForm(true);
  };

  const handleFormClose = () => {
    setShowAddForm(false);
    setEditingCustomer(null);
  };

  const handleFormSubmit = async (customerData) => {
    if (editingCustomer) {
      await onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      await onAddCustomer(customerData);
    }
    handleFormClose();
  };

  return (
    <div className="customers-list">
      <div className="customers-header">
        <div>
          <h2 className="customers-title">👥 Customers</h2>
          <p className="customers-subtitle">{customers.length} registered customers</p>
        </div>
        {canEdit && (
          <Button
            variant="primary"
            onClick={() => setShowAddForm(true)}
            icon="user-plus"
          >
            Add Customer
          </Button>
        )}
      </div>

      <div className="customers-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone, place, or GSTIN..."
        />
      </div>

      <div className="customers-grid">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <CustomerCard 
              key={customer.id}
              customer={customer}
              onEdit={canEdit ? handleEdit : null}
              onDelete={canDelete ? onDeleteCustomer : null}
              onViewHistory={onViewHistory}
            />
          ))
        ) : (
          <div className="empty-state">
            <Icon name="users" size={64} color="#cbd5e1" />
            <p>No customers found</p>
            {searchQuery && (
              <Button 
                variant="secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {showAddForm && (
        <CustomerForm 
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
