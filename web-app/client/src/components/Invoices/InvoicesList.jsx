import React, { useState } from 'react';
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

  const filteredInvoices = invoices.filter(invoice => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      invoice.id?.toString().includes(query) ||
      invoice.customer?.name?.toLowerCase().includes(query) ||
      invoice.customer?.phone?.includes(query);

    const invoiceDate = new Date(invoice.createdAt || invoice.date);
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

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="invoices-list">
      <div className="invoices-header">
        <div>
          <h2 className="invoices-title">🧾 Invoices</h2>
          <p className="invoices-subtitle">
            {filteredInvoices.length} invoices • Total: {formatCurrency0(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="invoices-controls">
        <SearchBar 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice #, customer name, or phone..."
        />

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
            <Icon name="file-text" size={64} color="#cbd5e1" />
            <p>No invoices found</p>
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
