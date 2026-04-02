import React, { useState, useEffect } from 'react';
import DateRangeSelector from './DateRangeSelector';
import Icon from '../../Icon';
import { formatCurrency0, formatCurrency } from '../../constants';
import { API, getAuthHeaders } from '../../utils/api';

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

  // CORRECT CALCULATIONS
  // Revenue = grandTotal (what customer pays, including GST)
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || inv.total || 0), 0);

  // Base Revenue = afterDiscount - GST (revenue excluding GST, after discount applied)
  const baseRevenue = filteredInvoices.reduce((sum, inv) => sum + ((inv.afterDiscount || 0) - (inv.gstAmount || 0)), 0);

  // GST Collected (goes to government, not company profit)
  const totalGST = filteredInvoices.reduce((sum, inv) => sum + (inv.gstAmount || 0), 0);

  // Cost of Goods Sold
  const totalCost = filteredInvoices.reduce((sum, inv) => sum + (inv.totalCost || 0), 0);

  // Gross Profit = Use backend-calculated profit (already accounts for GST properly)
  const totalProfit = filteredInvoices.reduce((sum, inv) => sum + (inv.totalProfit || inv.profit || 0), 0);

  // Payment tracking (EMI-aware)
  const paymentSummary = filteredInvoices.reduce((acc, inv) => {
    const grandTotal = inv.grandTotal || inv.total || 0;
    const paymentMode = (inv.paymentMode || 'cash').toLowerCase();
    
    if (paymentMode === 'emi' && inv.emiDetails) {
      const downPayment = inv.emiDetails.downPayment || 0;
      acc.collected += downPayment;
      acc.pending += (grandTotal - downPayment);
      acc.emiCount += 1;
    } else {
      acc.collected += grandTotal;
    }
    
    return acc;
  }, { collected: 0, pending: 0, emiCount: 0 });

  // compute expenses for the same period
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await fetch(API('/api/expenses'), { 
          headers: { 
            ...getAuthHeaders(),
            'Content-Type': 'application/json' 
          } 
        });
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
    baseRevenue,
    totalGST,
    totalCost,
    totalProfit,
    totalExpenses,
    netProfit: totalProfit - totalExpenses,
    totalProducts: products.length,
    totalCustomers: customers.length,
    lowStockCount: products.filter(p => p.quantity < p.minStock).length,
    paymentSummary
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
        <h3>📊 Summary</h3>
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
              <div className="summary-item" style={{ color: '#10b981' }}>
                <Icon name="trending-up" size={24} />
                <div>
                  <span>Gross Profit</span>
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
              <div className="summary-item" style={{ color: reportData.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
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

      {/* Payment Summary Section */}
      <div className="report-summary" style={{ marginTop: '24px' }}>
        <h3>💰 Payment Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <Icon name="dollar-sign" size={24} />
            <div>
              <span>Total Revenue</span>
              <strong>{formatCurrency0(reportData.totalRevenue)}</strong>
              <small style={{ color: '#64748b', fontSize: '11px' }}>Total billed amount</small>
            </div>
          </div>
          
          <div className="summary-item" style={{ color: '#10b981' }}>
            <Icon name="check-circle" size={24} />
            <div>
              <span>Collected Amount</span>
              <strong>{formatCurrency0(reportData.paymentSummary.collected)}</strong>
              <small style={{ color: '#64748b', fontSize: '11px' }}>Cash received</small>
            </div>
          </div>
          
          {reportData.paymentSummary.pending > 0 && (
            <div className="summary-item" style={{ color: '#f59e0b' }}>
              <Icon name="clock" size={24} />
              <div>
                <span>Pending Amount</span>
                <strong>{formatCurrency0(reportData.paymentSummary.pending)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>{reportData.paymentSummary.emiCount} EMI invoice(s)</small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Breakdown Section */}
      {canViewProfit && (
        <div className="report-summary" style={{ marginTop: '24px' }}>
          <h3>📈 Financial Breakdown</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <Icon name="dollar-sign" size={24} />
              <div>
                <span>Base Revenue (Excl. GST)</span>
                <strong>{formatCurrency0(reportData.baseRevenue)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Revenue before tax</small>
              </div>
            </div>
            
            <div className="summary-item">
              <Icon name="percent" size={24} />
              <div>
                <span>GST Collected</span>
                <strong>{formatCurrency0(reportData.totalGST)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Paid to government</small>
              </div>
            </div>
            
            <div className="summary-item">
              <Icon name="shopping-cart" size={24} />
              <div>
                <span>Total Cost (COGS)</span>
                <strong>{formatCurrency0(reportData.totalCost)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Cost of goods sold</small>
              </div>
            </div>
            
            <div className="summary-item" style={{ color: '#10b981' }}>
              <Icon name="trending-up" size={24} />
              <div>
                <span>Gross Profit</span>
                <strong>{formatCurrency0(reportData.totalProfit)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  {reportData.baseRevenue > 0 ? `${((reportData.totalProfit / reportData.baseRevenue) * 100).toFixed(1)}% margin` : '0% margin'}
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMI Details Section */}
      {reportData.paymentSummary.emiCount > 0 && (
        <div className="report-summary" style={{ marginTop: '24px' }}>
          <h3>💳 EMI Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <Icon name="file-text" size={24} />
              <div>
                <span>EMI Invoices</span>
                <strong>{reportData.paymentSummary.emiCount}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Active EMI plans</small>
              </div>
            </div>
            
            <div className="summary-item" style={{ color: '#10b981' }}>
              <Icon name="check-circle" size={24} />
              <div>
                <span>Down Payments</span>
                <strong>{formatCurrency0(reportData.paymentSummary.collected)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Initial collection</small>
              </div>
            </div>
            
            <div className="summary-item" style={{ color: '#f59e0b' }}>
              <Icon name="clock" size={24} />
              <div>
                <span>Remaining Amount</span>
                <strong>{formatCurrency0(reportData.paymentSummary.pending)}</strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>To be collected</small>
              </div>
            </div>
            
            <div className="summary-item">
              <Icon name="activity" size={24} />
              <div>
                <span>Collection Status</span>
                <strong>
                  {reportData.totalRevenue > 0 
                    ? `${((reportData.paymentSummary.collected / reportData.totalRevenue) * 100).toFixed(1)}%` 
                    : '0%'}
                </strong>
                <small style={{ color: '#64748b', fontSize: '11px' }}>Amount collected</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
