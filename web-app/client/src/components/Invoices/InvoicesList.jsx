import React, { useState, useMemo } from 'react';
import InvoiceCard from './InvoiceCard';
import InvoiceDetails from './InvoiceDetails';
import InvoiceActions from './InvoiceActions';
import SearchBar from '../Common/SearchBar';
import Button from '../Common/Button';
import AdminConfirmDialog from '../Common/AdminConfirmDialog';
import Icon from '../../Icon';
import { formatCurrency0, formatCurrency, PAYMENT_MODE_LABELS } from '../../constants';
import { formatDateOnlyIST, formatTimeOnlyIST } from '../../utils/dateFormatter';

export default function InvoicesList({
  invoices,
  onDeleteInvoice,
  onExportPDF,
  onShareWhatsApp,
  onRefresh,       // Manual refresh function
  isRefreshing,    // Refreshing state
  lastRefreshTime, // Last refresh timestamp
  canDelete
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  
  // Delete state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(invoice => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        invoice.id?.toString().includes(query) ||
        invoice.billNumber?.toLowerCase().includes(query) ||
        invoice.customer?.name?.toLowerCase().includes(query) ||
        invoice.customer?.phone?.includes(query) ||
        invoice.customerName?.toLowerCase().includes(query) ||
        invoice.customerPhone?.includes(query) ||
        invoice.createdByUsername?.toLowerCase().includes(query);

      const invoiceDate = new Date(invoice.createdAt || invoice.billDate || invoice.date);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let matchesDate = true;
      switch (dateFilter) {
        case 'today':
          matchesDate = invoiceDate >= today;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = invoiceDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = invoiceDate >= monthAgo;
          break;
      }

      return matchesSearch && matchesDate;
    });

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.billDate || a.date);
      const dateB = new Date(b.createdAt || b.billDate || b.date);
      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'highest') return (b.total || 0) - (a.total || 0);
      if (sortBy === 'lowest') return (a.total || 0) - (b.total || 0);
      return 0;
    });

    return result;
  }, [invoices, searchQuery, dateFilter, sortBy]);

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const todayCount = invoices.filter(inv => {
    const d = new Date(inv.createdAt || inv.billDate || inv.date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const handleDeleteClick = (invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async (password) => {
    if (!invoiceToDelete) return;
    
    setIsDeleting(true);
    const result = await onDeleteInvoice(invoiceToDelete.id, password);
    setIsDeleting(false);
    
    if (result.success) {
      setDeleteConfirmOpen(false);
      setInvoiceToDelete(null);
    } else {
      alert(result.error || 'Failed to delete invoice. Please check the admin password.');
    }
  };

  return (
    <div className="erp-invoices-view invoices-list">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">
            <Icon name="file-text" size={22} style={{ color: 'var(--primary)', marginRight: 6 }} />
            Billing Ledger & Invoices
          </h2>
          <p className="page-subtitle">
            {filteredInvoices.length} invoices &bull; Cumulative Billing: {formatCurrency0(totalRevenue)}
            {lastRefreshTime && (
              <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                &bull; Updated: {new Date(lastRefreshTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
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
              className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid"
            >
              <Icon name="grid" size={14} />
              <span>Cards</span>
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

          <div className="invoices-stats-pills" style={{ display: 'flex', gap: '8px' }}>
            <div className="stat-pill badge badge-primary" style={{ padding: '6px 12px' }}>
              <span>Today: <strong>{todayCount}</strong></span>
            </div>
            <div className="stat-pill badge badge-gray" style={{ padding: '6px 12px' }}>
              <span>Total: <strong>{invoices.length}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="table-wrap invoices-controls" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px', minWidth: '220px' }}>
            <SearchBar 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice #, customer, phone, salesperson..."
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select date-filter-select"
              aria-label="Filter by Date"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
              aria-label="Sort Invoices"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="highest">Sort: Highest Amount</option>
              <option value="lowest">Sort: Lowest Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: DATA TABLE */}
      {viewMode === 'table' ? (
        <div className="table-wrap">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date & Time</th>
                  <th>Customer Information</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th>Cashier</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map(invoice => {
                    const date = new Date(invoice.createdAt || invoice.billDate || invoice.date);
                    const formattedDate = formatDateOnlyIST(date);
                    const formattedTime = formatTimeOnlyIST(date);
                    const billNumber = invoice.billNumber || invoice.id;
                    const customerName = invoice.customer?.name || invoice.customerName || 'Walk-in Customer';
                    const customerPhone = invoice.customer?.phone || invoice.customerPhone || '';
                    const isWalkIn = customerName === 'Walk-in Customer';

                    return (
                      <tr 
                        key={invoice.id} 
                        className="invoice-card invoice-table-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        {/* Invoice Number */}
                        <td>
                          <span className="tabular" style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                            #{billNumber}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }} className="tabular">
                            {formattedDate}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="tabular">
                            {formattedTime}
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {customerName}
                          </div>
                          {customerPhone && (
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }} className="tabular">
                              {customerPhone}
                            </div>
                          )}
                        </td>

                        {/* Payment Method */}
                        <td>
                          <span className="badge badge-primary">
                            {PAYMENT_MODE_LABELS[invoice.paymentMode] || invoice.paymentMode || 'CASH'}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular">
                          {formatCurrency0(invoice.total)}
                        </td>

                        {/* Cashier */}
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {invoice.createdByUsername || 'Admin'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-success">
                            Paid
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => setSelectedInvoice(invoice)}
                              icon="eye"
                              className="btn-xs"
                            >
                              View
                            </Button>

                            <InvoiceActions 
                              invoice={invoice}
                              onExport={onExportPDF}
                              onShare={onShareWhatsApp}
                            />

                            {canDelete && (
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() => handleDeleteClick(invoice)}
                                icon="trash-2"
                                className="btn-xs"
                              >
                                Delete
                              </Button>
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
                        <Icon name="file-text" size={32} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>No billing records matched your query.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: CARDS VIEW */
        <div className="invoices-grid">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map(invoice => (
              <InvoiceCard 
                key={invoice.id}
                invoice={invoice}
                onView={() => setSelectedInvoice(invoice)}
                onDelete={canDelete ? () => handleDeleteClick(invoice) : null}
                onExport={onExportPDF}
                onShare={onShareWhatsApp}
              />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center' }}>
              <Icon name="file-text" size={48} color="var(--border-strong)" />
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>No invoices found</p>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetails 
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onExport={onExportPDF}
          onShare={onShareWhatsApp}
        />
      )}

      {/* Delete Confirmation */}
      <AdminConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Confirm Invoice Reversal & Deletion"
        message={`Are you sure you want to delete Invoice #${invoiceToDelete?.billNumber || invoiceToDelete?.id}? This will reverse the transaction and restore the inventory stock.`}
      />
    </div>
  );
}
