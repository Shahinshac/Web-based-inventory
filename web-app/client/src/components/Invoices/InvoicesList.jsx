import React, { useState, useMemo } from 'react';
import InvoiceCard from './InvoiceCard';
import InvoiceDetails from './InvoiceDetails';
import SearchBar from '../Common/SearchBar';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';

export default function InvoicesList({ 
  invoices, 
  onDeleteInvoice,
  onExportPDF,
  onShareWhatsApp,
  canDelete
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  const filteredInvoices = useMemo(() => {
    let result = invoices.filter(invoice => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        invoice.id?.toString().includes(query) ||
        invoice.customer?.name?.toLowerCase().includes(query) ||
        invoice.customer?.phone?.includes(query) ||
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

  return (
    <div className="invoices-list">
      <div className="invoices-header">
        <div>
          <h2 className="invoices-title">
            <Icon name="file-text" size={24} />
            Invoices
          </h2>
          <p className="invoices-subtitle">
            {filteredInvoices.length} invoices &bull; Total: {formatCurrency0(totalRevenue)}
          </p>
        </div>
        <div className="invoices-stats-pills">
          <div className="stat-pill">
            <Icon name="calendar" size={14} />
            <span>Today: <strong>{todayCount}</strong></span>
          </div>
          <div className="stat-pill">
            <Icon name="shopping-bag" size={14} />
            <span>All: <strong>{invoices.length}</strong></span>
          </div>
        </div>
      </div>

      <div className="invoices-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice #, customer, phone, salesperson..."
        />
        <div className="invoices-filter-group">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </div>
      </div>

      <div className="invoices-grid">
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map(invoice => (
            <InvoiceCard 
              key={invoice.id}
              invoice={invoice}
              onView={() => setSelectedInvoice(invoice)}
              onDelete={canDelete ? onDeleteInvoice : null}
              onExport={onExportPDF}
              onShare={onShareWhatsApp}
            />
          ))
        ) : (
          <div className="empty-state">
            <Icon name="file-text" size={56} color="#cbd5e1" />
            <h4>No Invoices Found</h4>
            <p>{searchQuery ? 'Try adjusting your search or filters' : 'Complete a sale to see invoices here'}</p>
          </div>
        )}
      </div>

      {selectedInvoice && (
        <InvoiceDetails 
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onExport={onExportPDF}
          onShare={onShareWhatsApp}
        />
      )}
    </div>
  );
}
