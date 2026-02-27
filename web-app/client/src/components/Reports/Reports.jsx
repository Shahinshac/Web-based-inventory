import React, { useState, useEffect } from 'react';
import DateRangeSelector from './DateRangeSelector';
import Icon from '../../Icon';
import { formatCurrency0 } from '../../constants';

export default function Reports({ 
  invoices, 
  products,
  customers,
  canViewProfit
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalExpenses, setTotalExpenses] = useState(0);

  const filteredInvoices = invoices.filter(inv => {
    if (!startDate || !endDate) return true;
    const invDate = new Date(inv.createdAt || inv.date);
    return invDate >= new Date(startDate) && invDate <= new Date(endDate);
  });

  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalProfit = filteredInvoices.reduce((sum, inv) => {
    const items = inv.items || [];
    const itemProfit = items.reduce((s, item) => {
      return s + ((item.price - (item.costPrice || 0)) * item.quantity);
    }, 0);
    return sum + itemProfit;
  }, 0);

  // compute expenses for the same period
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch('/api/expenses', { headers: { 'Content-Type': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          let filtered = data;
          if (startDate || endDate) {
            filtered = data.filter(e => {
              const d = new Date(e.date);
              if (startDate && d < new Date(startDate)) return false;
              if (endDate && d > new Date(endDate)) return false;
              return true;
            });
          }
          const sum = filtered.reduce((s, e) => s + (e.amount || 0), 0);
          setTotalExpenses(sum);
        }
      } catch (err) {
        console.error('Failed to fetch expenses for report:', err);
      }
    };
    fetchExpenses();
  }, [startDate, endDate]);

  const reportData = {
    period: startDate && endDate ? `${startDate} to ${endDate}` : 'All Time',
    totalInvoices: filteredInvoices.length,
    totalRevenue,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    totalProducts: products.length,
    totalCustomers: customers.length,
    lowStockCount: products.filter(p => p.quantity < p.minStock).length
  };

  return (
    <div className="reports">
      <div className="reports-header">
        <div>
          <h2 className="reports-title">📈 Reports</h2>
          <p className="reports-subtitle">Generate and export business reports</p>
        </div>
      </div>

      <DateRangeSelector 
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <div className="report-summary">
        <h3>Report Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <Icon name="calendar" size={24} />
            <div>
              <span>Period</span>
              <strong>{reportData.period}</strong>
            </div>
          </div>
          
          <div className="summary-item">
            <Icon name="file-text" size={24} />
            <div>
              <span>Total Invoices</span>
              <strong>{reportData.totalInvoices}</strong>
            </div>
          </div>
          
          <div className="summary-item">
            <Icon name="dollar-sign" size={24} />
            <div>
              <span>Total Revenue</span>
              <strong>{formatCurrency0(reportData.totalRevenue)}</strong>
            </div>
          </div>

          {canViewProfit && (
            <>
              <div className="summary-item">
                <Icon name="trending-up" size={24} />
                <div>
                  <span>Total Profit</span>
                  <strong>{formatCurrency0(reportData.totalProfit)}</strong>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="credit-card" size={24} />
                <div>
                  <span>Total Expenses</span>
                  <strong>{formatCurrency0(reportData.totalExpenses)}</strong>
                </div>
              </div>
              <div className="summary-item">
                <Icon name="dollar-sign" size={24} />
                <div>
                  <span>Net Profit</span>
                  <strong>{formatCurrency0(reportData.netProfit)}</strong>
                </div>
              </div>
            </>
          )}
          
          <div className="summary-item">
            <Icon name="package" size={24} />
            <div>
              <span>Total Products</span>
              <strong>{reportData.totalProducts}</strong>
            </div>
          </div>
          
          <div className="summary-item">
            <Icon name="users" size={24} />
            <div>
              <span>Total Customers</span>
              <strong>{reportData.totalCustomers}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
