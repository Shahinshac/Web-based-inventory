import React, { useState } from 'react';
import CustomerCard from './CustomerCard';
import VisitingCard from './VisitingCard';
import CustomerForm from './CustomerForm';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import AdminConfirmDialog from '../Common/AdminConfirmDialog';
import Icon from '../../Icon';
import CustomerHistoryModal from './CustomerHistoryModal';
import { formatCurrency0 } from '../../constants';
import './VisitingCard.css';

export default function CustomersList({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onViewHistory,
  onRefresh,       // Manual refresh function
  isRefreshing,    // Refreshing state
  lastRefreshTime, // Last refresh timestamp
  canEdit,
  canDelete,
  onShareWhatsApp
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards' | 'visiting'

  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [historyData, setHistoryData] = useState({ bills: [], warranties: [], stats: {} });
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
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

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async (password) => {
    if (!customerToDelete) return;
    
    setIsDeleting(true);
    const result = await onDeleteCustomer(customerToDelete.id, password);
    setIsDeleting(false);
    
    if (result.success) {
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } else {
      alert(result.error || 'Failed to delete customer. Please check the admin password.');
    }
  };

  const handleViewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setHistoryData({ bills: [], warranties: [], stats: {} });
    setHistoryError('');
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);

    try {
      const result = await onViewHistory(customer.id);
      if (result.success) {
        setHistoryData({
          bills: result.purchases.bills || [],
          warranties: result.purchases.warranties || [],
          stats: result.purchases.stats || {}
        });
      } else {
        setHistoryError(result.error || 'Failed to load customer history');
      }
    } catch (err) {
      setHistoryError(err.message || 'Failed to load customer history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div className="erp-customers-view customers-list">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">
            <Icon name="users" size={22} style={{ color: 'var(--primary)', marginRight: 6 }} />
            Customer Directory & CRM
          </h2>
          <p className="page-subtitle">
            {customers.length} registered accounts and purchase histories
            {lastRefreshTime && (
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                • Updated: {new Date(lastRefreshTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
              </span>
            )}
          </p>
        </div>

        <div className="page-actions">
          {/* View toggle */}
          <div className="table-actions-group" style={{ display: 'flex', gap: '4px', background: 'var(--surface-subtle)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Icon name="table" size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('cards')}
              title="Card Grid"
            >
              <Icon name="grid" size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'visiting' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('visiting')}
              title="Visiting Cards"
            >
              <Icon name="credit-card" size={14} />
              <span>Visiting</span>
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={onRefresh}
            icon="refresh-cw"
            disabled={isRefreshing}
            className="btn-sm"
          >
            {isRefreshing ? 'Syncing...' : 'Sync'}
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              onClick={() => setShowAddForm(true)}
              icon="user-plus"
              className="btn-sm"
            >
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="table-wrap" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, place, email or GSTIN..."
        />
      </div>

      {/* VIEW 1: DATA TABLE */}
      {viewMode === 'table' ? (
        <div className="table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Place / City</th>
                  <th>GSTIN / Company</th>
                  <th style={{ textAlign: 'right' }}>Total Orders</th>
                  <th style={{ textAlign: 'right' }}>Total Spent</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => {
                    const initials = customer.name
                      ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'CU';

                    return (
                      <tr 
                        key={customer.id}
                        className="customer-card customer-table-row"
                        style={{ cursor: canEdit ? 'pointer' : 'default' }}
                      >
                        {/* Avatar */}
                        <td style={{ textAlign: 'center', padding: '6px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {initials}
                          </div>
                        </td>

                        {/* Customer Name */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {customer.name}
                          </div>
                          {customer.position && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {customer.position}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }} className="tabular">
                            {customer.phone || '—'}
                          </div>
                          {customer.email && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {customer.email}
                            </div>
                          )}
                        </td>

                        {/* Location */}
                        <td>
                          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            {customer.place || '—'}
                          </span>
                        </td>

                        {/* GSTIN / Business */}
                        <td>
                          {customer.gstin ? (
                            <span className="badge badge-primary tabular" style={{ fontFamily: 'var(--font-mono)' }}>
                              {customer.gstin}
                            </span>
                          ) : customer.company ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{customer.company}</span>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)' }}>—</span>
                          )}
                        </td>

                        {/* Total Orders */}
                        <td style={{ textAlign: 'right' }} className="tabular">
                          <span style={{ fontWeight: 600 }}>{customer.purchasesCount || 0}</span>
                        </td>

                        {/* Total Spent */}
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular">
                          {formatCurrency0(customer.totalPurchases || 0)}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={(e) => { e.stopPropagation(); handleViewHistory(customer); }}
                              title="Purchase & Warranty History"
                            >
                              <Icon name="clock" size={13} />
                              <span>History</span>
                            </button>

                            {canEdit && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                                title="Edit Customer"
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                style={{ color: 'var(--danger)' }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(customer); }}
                                title="Delete Customer"
                              >
                                <Icon name="trash-2" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <Icon name="users" size={32} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>No customer records found.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: CARDS OR VISITING CARDS */
        <div className={viewMode === 'visiting' ? 'visiting-cards-grid' : 'customers-grid'}>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => (
              viewMode === 'visiting' ? (
                <VisitingCard
                  key={customer.id}
                  customer={customer}
                  onEdit={canEdit ? handleEdit : null}
                  onDelete={canDelete ? () => handleDeleteClick(customer) : null}
                  onViewHistory={handleViewHistory}
                  onShareWhatsApp={onShareWhatsApp}
                />
              ) : (
                <CustomerCard 
                  key={customer.id}
                  customer={customer}
                  onEdit={canEdit ? handleEdit : null}
                  onDelete={canDelete ? () => handleDeleteClick(customer) : null}
                  onViewHistory={handleViewHistory}
                  onShareWhatsApp={onShareWhatsApp}
                />
              )
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center' }}>
              <Icon name="users" size={48} color="var(--border-strong)" />
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>No customers found</p>
            </div>
          )}
        </div>
      )}

      {/* Customer Form Modal */}
      {showAddForm && (
        <CustomerForm 
          customer={editingCustomer}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}

      {/* Customer History Modal */}
      <CustomerHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        data={historyData}
        isLoading={isHistoryLoading}
        error={historyError}
      />

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Customer Deletion"
        message={`Are you sure you want to delete ${customerToDelete?.name}? This will permanently remove their records from the database.`}
      />
    </div>
  );
}
