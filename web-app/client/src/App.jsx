import React, { useState, useEffect } from 'react';
import { initAnalytics, trackPageView, trackEvent } from './analytics';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import Login from './Login';
import Sidebar from './components/Layout/Sidebar';
import POSSystem from './components/POS/POSSystem';
import ProductsList from './components/Products/ProductsList';
import CustomersList from './components/Customers/CustomersList';
import InvoicesList from './components/Invoices/InvoicesList';
import AnalyticsPage from './components/Analytics/Analytics';
import Reports from './components/Reports/Reports';
import UsersList from './components/Users/UsersList';
import AuditLogs from './components/AuditLogs/AuditLogs';
import StockManagement from './components/Inventory/StockManagement';
import Returns from './components/Returns/Returns';
import Expenses from './components/Expenses/Expenses';
import ExportData from './components/ExportData/ExportData';
import Dashboard from './components/Dashboard/Dashboard';
import Toast from './components/Common/Toast';
import { useAuth } from './hooks/useAuth';

import { useProducts } from './hooks/useProducts';
import { useCustomers } from './hooks/useCustomers';
import { useInvoices } from './hooks/useInvoices';
import { useCart } from './hooks/useCart';
import { useAnalytics } from './hooks/useAnalytics';
import { usePWA } from './hooks/usePWA';
import { useOffline } from './hooks/useOffline';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
// Removed unused constants import
import { API, apiPost, apiPatch, getAuthHeaders } from './utils/api';
import './styles.css';

export default function App() {
  // State
  const [tab, setTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [companyInfo] = useState({
    name: '26:07 Electronics',
    address: 'Electronics Plaza, Tech Street, City - 560001',
    phone: '7594012761',
    email: 'support@2607electronics.com',
    gstin: '29AABCU9603R1ZX',
    logo: '⚡'
  });
  
  const [recentActivity, setRecentActivity] = useState([]);

  // Custom hooks
  const { 
    isAuthenticated, 
    isAdmin, 
    currentUser, 
    userRole,
    handleLogin: login, 
    handleLogout: logout,
    handleRegister: register,
    handleUpdateUserPhoto,
    handleDeleteUserPhoto
   } = useAuth();

  const { isOnline } = useOffline(isAuthenticated);

  const {
    products,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    uploadProductPhoto,
    deleteProductPhoto,
    manualRefresh: refreshProducts,
    isRefreshing: isRefreshingProducts,
    lastRefreshTime: productsLastRefresh
  } = useProducts(isOnline, isAuthenticated, currentUser, isAdmin);

  const {
    customers,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerPurchases,
    manualRefresh: refreshCustomers,
    isRefreshing: isRefreshingCustomers,
    lastRefreshTime: customersLastRefresh
  } = useCustomers(isOnline, isAuthenticated);

  const {
    invoices,
    fetchInvoices,
    createInvoice,
    deleteInvoice,
    filterInvoices,
    manualRefresh: refreshInvoices,
    isRefreshing: isRefreshingInvoices,
    lastRefreshTime: invoicesLastRefresh
  } = useInvoices(isOnline, isAuthenticated, tab);
  
  const { cart, addToCart, setQuantity: updateCartItem, removeFromCart, clearCart, selectedCustomer, setSelectedCustomer: selectCustomer, errors: cartErrors } = 
    useCart(products);
  
  const { analyticsData, dateRange, setDateRange, fetchAnalyticsData } = 
    useAnalytics(isOnline, tab);
  
  const { showInstallPrompt, installPWA, dismissInstallPrompt } = usePWA();

  // Permission helpers
  const canViewProfit = () => userRole === 'admin' || userRole === 'manager' || isAdmin;
  const canEdit = () => userRole === 'admin' || userRole === 'manager' || isAdmin;
  const canDelete = () => userRole === 'admin' || userRole === 'manager' || isAdmin;
  const canReturn = () => true; // all authenticated roles can process returns

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTabChange: setTab,
    onNewProduct: canEdit() ? () => {} : undefined,
    onNewCustomer: canEdit() ? () => {} : undefined,
    onShowHelp: () => alert(getShortcutsHelp()),
  });

  const getShortcutsHelp = () => `Keyboard Shortcuts:
Tab Navigation:
Alt+1 or F1: Dashboard
Alt+2 or F2: POS System
Alt+3 or F3: Products
Alt+4 or F4: Customers
Alt+5 or F5: Invoices
Alt+6 or F6: Analytics
Alt+7 or F7: Reports

Actions:
Ctrl+N: New Product
Ctrl+K: New Customer
Ctrl+F: Search Products
Ctrl+H: Show Shortcuts

General:
Esc: Close modals/dialogs`;

  // Initialize analytics
  useEffect(() => {
    initAnalytics();
    trackPageView('Inventory Management App');
  }, []);

  // Fetch recent activity when authenticated or when tab changes to dashboard
  useEffect(() => {
    if (isAuthenticated && (tab === 'dashboard' || tab === 'pos')) {
      fetchRecentActivity();
    }
  }, [isAuthenticated, tab]);

  // Track tab changes
  const handleTabChange = (newTab) => {
    setTab(newTab);
    trackEvent('navigation', `tab_${newTab}`);
    trackPageView(`${newTab} Tab`);
  };

  // Fetch recent activity from audit logs
  const fetchRecentActivity = async () => {
    try {
      const response = await fetch(API('/api/admin/audit-logs?limit=10'), { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || data || [];
        
        // Format activities for display
        const activities = logs.map(log => {
          const timeAgo = getTimeAgo(new Date(log.timestamp));
          let text = '';
          
          switch (log.action) {
            case 'PRODUCT_ADDED':
              text = `Added product "${log.details?.productName || 'Unknown'}"`;
              break;
            case 'PRODUCT_UPDATED':
              text = `Updated product "${log.details?.productName || 'Unknown'}"`;
              break;
            case 'PRODUCT_DELETED':
              text = `Deleted product "${log.details?.productName || 'Unknown'}"`;
              break;
            case 'PRODUCT_STOCK_UPDATED':
              text = `Updated stock for "${log.details?.productName || 'Unknown'}"`;
              break;
            case 'SALE_COMPLETED':
            case 'INVOICE_CREATED':
              text = `Completed sale - ${log.details?.total ? `₹${log.details.total}` : 'N/A'}`;
              break;
            case 'CUSTOMER_ADDED':
              text = `Added customer "${log.details?.customerName || 'Unknown'}"`;
              break;
            case 'CUSTOMER_UPDATED':
              text = `Updated customer "${log.details?.customerName || 'Unknown'}"`;
              break;
            case 'USER_LOGIN':
              text = `${log.username} logged in`;
              break;
            case 'USER_REGISTERED':
              text = `New user registered: ${log.username}`;
              break;
            default:
              text = log.action.replace(/_/g, ' ').toLowerCase();
          }
          
          return {
            text,
            time: timeAgo,
            timestamp: log.timestamp
          };
        });
        
        setRecentActivity(activities);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Helper function to calculate time ago
  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Checkout handler
  const handleCheckout = async (billData) => {
    try {
      const result = await createInvoice(billData);
      if (result.success) {
        showNotification('✓ Sale completed successfully!', 'success');
        clearCart();
        selectCustomer(null);
        await fetchProducts();
        await fetchInvoices(true);
        await fetchRecentActivity(); // Refresh activity after sale
        trackEvent('sale_completed', 'transaction', `Bill-${result.invoice?.id}`, billData.total);
        return { success: true, invoice: result.invoice };
      } else {
        showNotification(result.error || 'Checkout failed', 'error');
        return { success: false };
      }
    } catch (error) {
      showNotification('Checkout failed. Please try again.', 'error');
      return { success: false };
    }
  };

  // Export functions (simplified - implement full logic as needed)
  const handleExportPDF = (invoice) => {
    try {
      const date = new Date(invoice.createdAt || invoice.date || invoice.billDate);
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      });
      const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      });

      const customerName = invoice.customer?.name || invoice.customerName || 'Walk-in Customer';
      const customerPhone = invoice.customer?.phone || invoice.customerPhone || '';
      const customerAddress = invoice.customer?.address || invoice.customerAddress || '';
      const customerPlace = invoice.customer?.place || invoice.customerPlace || '';
      const salesperson = invoice.createdByUsername || 'N/A';
      const paymentMode = invoice.paymentMode || 'cash';
      const billNumber = invoice.billNumber || invoice.id;

      const subtotal = Number(invoice.subtotal || invoice.total || 0);
      const discountAmt = Number(invoice.discountAmount || 0);
      const discountPct = Number(invoice.discountPercent || 0);
      const gstAmount = Number(invoice.gstAmount || 0);
      const cgst = Number(invoice.cgst || 0);
      const sgst = Number(invoice.sgst || 0);
      const igst = Number(invoice.igst || 0);
      const grandTotal = Number(invoice.total || invoice.grandTotal || 0);

      const items = (invoice.items || []).map((item, i) => `
        <tr>
          <td style="text-align:center;color:#64748b;font-weight:500;">${i + 1}</td>
          <td>
            <div style="font-weight:600;color:#0f172a;">${item.name || item.productName}</div>
            ${item.hsnCode ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;">HSN: ${item.hsnCode}</div>` : ''}
          </td>
          <td style="text-align:center;">${item.quantity}</td>
          <td style="text-align:right;">₹${Number(item.price || item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align:right;font-weight:600;">₹${(Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
        </tr>
      `).join('');

      // Split payment info
      let splitInfo = '';
      if (paymentMode === 'split' && invoice.splitPaymentDetails) {
        const spd = invoice.splitPaymentDetails;
        splitInfo = `
          <div style="margin-top:6px;font-size:13px;color:#475569;">
            ${Number(spd.cash || 0) > 0 ? `<div>Cash: ₹${Number(spd.cash).toFixed(2)}</div>` : ''}
            ${Number(spd.upi || 0) > 0 ? `<div>UPI: ₹${Number(spd.upi).toFixed(2)}</div>` : ''}
            ${Number(spd.card || 0) > 0 ? `<div>Card: ₹${Number(spd.card).toFixed(2)}</div>` : ''}
          </div>`;
      }

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${billNumber} - ${companyInfo.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    *{margin:0;padding:0;box-sizing:border-box;}
    
    @page{size:A4;margin:0;}
    
    body{
      font-family:'Inter',system-ui,-apple-system,sans-serif;
      background:#f1f5f9;
      color:#0f172a;
      display:flex;
      justify-content:center;
      padding:20px;
      -webkit-print-color-adjust:exact!important;
      print-color-adjust:exact!important;
    }
    
    .invoice-page{
      width:210mm;
      min-height:297mm;
      background:#fff;
      padding:0;
      position:relative;
      overflow:hidden;
    }
    
    /* Top accent bar */
    .accent-bar{
      height:6px;
      background:linear-gradient(90deg,#4f46e5,#7c3aed,#6366f1);
    }
    
    .invoice-inner{
      padding:40px 44px 30px;
    }
    
    /* Header */
    .inv-header{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      margin-bottom:32px;
      padding-bottom:24px;
      border-bottom:2px solid #e2e8f0;
    }
    
    .company-block h1{
      font-size:26px;
      font-weight:800;
      color:#4f46e5;
      letter-spacing:-0.5px;
      margin-bottom:6px;
    }
    .company-block p{
      font-size:12.5px;
      color:#64748b;
      line-height:1.6;
    }
    .company-block .gstin{
      font-weight:600;
      color:#334155;
      margin-top:4px;
    }
    
    .inv-title-block{text-align:right;}
    .inv-title-block h2{
      font-size:22px;
      font-weight:800;
      color:#0f172a;
      text-transform:uppercase;
      letter-spacing:2px;
      margin-bottom:12px;
    }
    .meta-table{font-size:12.5px;text-align:right;}
    .meta-table td{padding:3px 0;}
    .meta-label{color:#94a3b8;font-weight:500;padding-right:14px;}
    .meta-value{color:#0f172a;font-weight:700;}
    
    /* Billing Grid */
    .bill-grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:24px;
      margin-bottom:28px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:20px 24px;
    }
    .bill-grid h3{
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:1.2px;
      color:#4f46e5;
      font-weight:700;
      margin-bottom:10px;
      padding-bottom:6px;
      border-bottom:2px solid #e0e7ff;
      display:inline-block;
    }
    .bill-grid p{font-size:13px;color:#334155;line-height:1.7;}
    .bill-grid .cust-name{font-size:15px;font-weight:700;color:#0f172a;margin-bottom:2px;}
    
    /* Items Table */
    .items-table{
      width:100%;
      border-collapse:separate;
      border-spacing:0;
      margin-bottom:28px;
      font-size:13px;
    }
    .items-table th{
      background:#f1f5f9;
      color:#64748b;
      text-transform:uppercase;
      font-size:11px;
      font-weight:700;
      letter-spacing:0.5px;
      padding:12px 14px;
      border-bottom:2px solid #e2e8f0;
    }
    .items-table th:first-child{border-radius:8px 0 0 8px;text-align:center;width:40px;}
    .items-table th:last-child{border-radius:0 8px 8px 0;text-align:right;}
    .items-table td{
      padding:14px;
      border-bottom:1px solid #f1f5f9;
      color:#334155;
      vertical-align:top;
    }
    .items-table tr:last-child td{border-bottom:none;}
    
    /* Summary */
    .summary-section{
      display:flex;
      justify-content:flex-end;
    }
    .summary-box{
      width:300px;
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:20px 24px;
    }
    .sum-row{
      display:flex;
      justify-content:space-between;
      font-size:13px;
      color:#64748b;
      padding:6px 0;
    }
    .sum-row.discount{color:#10b981;font-weight:600;}
    .sum-row.total{
      margin-top:10px;
      padding-top:12px;
      border-top:2px solid #e2e8f0;
      font-size:18px;
      font-weight:800;
      color:#4f46e5;
    }
    
    /* Footer */
    .inv-footer{
      position:absolute;
      bottom:0;
      left:0;
      right:0;
      padding:20px 44px 24px;
      text-align:center;
      border-top:1px solid #e2e8f0;
      background:#fafbfc;
    }
    .inv-footer .thanks{
      font-weight:700;
      font-size:14px;
      color:#0f172a;
      margin-bottom:4px;
    }
    .inv-footer p{font-size:12px;color:#94a3b8;line-height:1.5;}
    
    /* Print overrides */
    @media print{
      body{background:#fff;padding:0;}
      .invoice-page{
        width:100%;
        min-height:auto;
        box-shadow:none;
      }
      .no-print{display:none!important;}
    }
    
    /* Print button bar */
    .print-bar{
      position:fixed;
      top:0;left:0;right:0;
      background:linear-gradient(135deg,#4f46e5,#7c3aed);
      padding:14px 24px;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:16px;
      z-index:999;
      box-shadow:0 4px 20px rgba(79,70,229,0.3);
    }
    .print-bar span{color:#fff;font-size:14px;font-weight:500;}
    .print-bar button{
      background:#fff;
      color:#4f46e5;
      border:none;
      padding:10px 28px;
      border-radius:8px;
      font-weight:700;
      font-size:14px;
      cursor:pointer;
      transition:all 0.2s;
    }
    .print-bar button:hover{transform:scale(1.05);box-shadow:0 4px 12px rgba(0,0,0,0.15);}
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>📄 Invoice ${billNumber}</span>
    <button onclick="window.print()">🖨️ Print / Save PDF</button>
    <button onclick="window.close()" style="background:#f1f5f9;color:#475569;">✕ Close</button>
  </div>
  
  <div class="invoice-page" style="margin-top:70px;">
    <div class="accent-bar"></div>
    <div class="invoice-inner">
      
      <div class="inv-header">
        <div class="company-block">
          <h1>${companyInfo.logo || '⚡'} ${companyInfo.name}</h1>
          <p>${companyInfo.address || ''}</p>
          <p>Phone: ${companyInfo.phone || ''} ${companyInfo.email ? `| ${companyInfo.email}` : ''}</p>
          ${companyInfo.gstin ? `<p class="gstin">GSTIN: ${companyInfo.gstin}</p>` : ''}
        </div>
        <div class="inv-title-block">
          <h2>Tax Invoice</h2>
          <table class="meta-table">
            <tr><td class="meta-label">Invoice No:</td><td class="meta-value">${billNumber}</td></tr>
            <tr><td class="meta-label">Date:</td><td class="meta-value">${formattedDate}</td></tr>
            <tr><td class="meta-label">Time:</td><td class="meta-value">${formattedTime}</td></tr>
            <tr><td class="meta-label">Sales Person:</td><td class="meta-value">${salesperson}</td></tr>
          </table>
        </div>
      </div>
      
      <div class="bill-grid">
        <div>
          <h3>Billed To</h3>
          <p class="cust-name">${customerName}</p>
          ${customerPhone ? `<p>Phone: ${customerPhone}</p>` : ''}
          ${customerAddress ? `<p>${customerAddress}</p>` : ''}
          ${customerPlace ? `<p>${customerPlace}</p>` : ''}
        </div>
        <div>
          <h3>Payment Info</h3>
          <p><strong>Method:</strong> ${paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)}</p>
          ${splitInfo}
          <p style="margin-top:6px;"><strong>Status:</strong> <span style="color:#10b981;font-weight:700;">Paid ✓</span></p>
        </div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item Description</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
      
      <div class="summary-section">
        <div class="summary-box">
          <div class="sum-row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
          ${discountAmt > 0 ? `<div class="sum-row discount"><span>Discount${discountPct > 0 ? ` (${discountPct}%)` : ''}</span><span>-₹${discountAmt.toFixed(2)}</span></div>` : ''}
          ${cgst > 0 ? `<div class="sum-row"><span>CGST (9%)</span><span>₹${cgst.toFixed(2)}</span></div><div class="sum-row"><span>SGST (9%)</span><span>₹${sgst.toFixed(2)}</span></div>` : ''}
          ${igst > 0 ? `<div class="sum-row"><span>IGST (18%)</span><span>₹${igst.toFixed(2)}</span></div>` : ''}
          ${cgst === 0 && igst === 0 && gstAmount > 0 ? `<div class="sum-row"><span>GST (18%)</span><span>₹${gstAmount.toFixed(2)}</span></div>` : ''}
          <div class="sum-row total"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div>
        </div>
      </div>
    </div>
    
    <div class="inv-footer">
      <div class="thanks">Thank you for your business!</div>
      <p>For queries, contact us at ${companyInfo.phone || ''}${companyInfo.email ? ` or ${companyInfo.email}` : ''}</p>
      <p style="font-size:10px;margin-top:8px;color:#cbd5e1;">This is a computer-generated invoice and does not require a physical signature.</p>
    </div>
  </div>
  
  <script>
    // Auto-print after font loads
    document.fonts.ready.then(function() { setTimeout(function() {}, 500); });
  </script>
</body>
</html>`;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        showNotification('📄 Invoice opened — click Print/Save PDF', 'success');
      } else {
        showNotification('Pop-up blocked! Please allow pop-ups for this site.', 'error');
      }
    } catch (e) {
      showNotification('Failed to generate invoice: ' + (e.message || 'Unknown error'), 'error');
      console.error(e);
    }
  };

  const handleShareWhatsApp = (invoice) => {
    try {
      const customerPhone = invoice.customerPhone || invoice.customer?.phone || '';
      const customerName = invoice.customerName || invoice.customer?.name || 'Customer';
      const billNumber = invoice.billNumber || invoice.id;
      const grandTotal = Number(invoice.total || invoice.grandTotal || 0);

      // Build message
      const itemsList = (invoice.items || [])
        .map((item, i) => `${i + 1}. ${item.name || item.productName} x${item.quantity} = ₹${(Number(item.price || item.unitPrice || 0) * Number(item.quantity || 0)).toFixed(0)}`)
        .join('\n');

      const message = [
        `📄 *Invoice #${billNumber}*`,
        `From: *${companyInfo.name}*`,
        `Date: ${new Date(invoice.createdAt || invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}`,
        '',
        `👤 Customer: ${customerName}`,
        '',
        `📦 *Items:*`,
        itemsList,
        '',
        invoice.discountAmount > 0 ? `💰 Discount: -₹${Number(invoice.discountAmount).toFixed(0)}` : '',
        invoice.gstAmount > 0 ? `📊 GST: ₹${Number(invoice.gstAmount).toFixed(0)}` : '',
        `💵 *Total: ₹${grandTotal.toFixed(0)}*`,
        '',
        `Payment: ${(invoice.paymentMode || 'cash').charAt(0).toUpperCase() + (invoice.paymentMode || 'cash').slice(1)} ✓`,
        '',
        `Thank you for your purchase! 🙏`,
        `— ${companyInfo.name}`,
        companyInfo.phone ? `📞 ${companyInfo.phone}` : ''
      ].filter(Boolean).join('\n');

      if (customerPhone && customerPhone.trim()) {
        let cleanPhone = customerPhone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        showNotification('✅ Opening WhatsApp...', 'success');
      } else {
        // No phone — open WhatsApp with just the text (user picks contact)
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        showNotification('⚠️ No phone number — please select contact manually', 'warning');
      }
    } catch (e) {
      showNotification('❌ Failed to open WhatsApp: ' + (e.message || 'Unknown error'), 'error');
      console.error(e);
    }
  };

  // User management (admin only)
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(API('/api/users'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const createUser = async (userData) => {
    try {
      const res = await fetch(API('/api/users/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`✅ ${data.message}`, 'success');
        await fetchUsers();
        return { success: true };
      } else {
        showNotification(`❌ ${data.error}`, 'error');
        return { success: false, error: data.error };
      }
    } catch (error) {
      showNotification('Failed to create user', 'error');
      return { success: false, error: 'Failed to create user' };
    }
  };

  const resetUserPassword = async (userId, newPassword) => {
    try {
      const res = await fetch(API(`/api/users/${userId}/reset-password`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`✅ ${data.message}`, 'success');
        return { success: true };
      } else {
        showNotification(`❌ ${data.error}`, 'error');
        return { success: false, error: data.error };
      }
    } catch (error) {
      showNotification('Failed to reset password', 'error');
      return { success: false, error: 'Failed to reset password' };
    }
  };

  const approveUser = async (userId, role = 'cashier') => {
    try {
      const res = await fetch(API(`/api/users/${userId}/approve`), { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        showNotification(`✅ User approved as ${role}!`, 'success');
        await fetchUsers();
      }
    } catch (error) {
      showNotification('Failed to approve user', 'error');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(API(`/api/users/${userId}`), { method: 'DELETE', headers: getAuthHeaders() });
      if (res.ok) {
        showNotification('✅ User deleted successfully!', 'success');
        await fetchUsers();
      }
    } catch (error) {
      showNotification('Failed to delete user', 'error');
    }
  };

  const changeUserRole = async (userId, newRole) => {
    try {
      const res = await fetch(API(`/api/users/${userId}/role`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        showNotification(`✅ Role updated to ${newRole}`, 'success');
        setUsers(prev => prev.map(u => (u.id === userId || u._id === userId) ? { ...u, role: newRole } : u));
      } else {
        const err = await res.json();
        showNotification(err.error || 'Failed to update role', 'error');
      }
    } catch {
      showNotification('Failed to update role', 'error');
    }
  };

  const forceLogoutUser = async (username) => {
    if (!confirm(`Force logout ${username}? You will need to enter admin password to confirm.`)) return;
    const adminPassword = prompt('Enter your admin password to confirm force logout:');
    if (!adminPassword) {
      showNotification('Action cancelled', 'info');
      return;
    }
    try {
      await apiPost('/api/admin/invalidate-user-session', {
        targetUsername: username,
        adminUsername: currentUser?.username,
        adminPassword
      });
      showNotification(`✅ Force logout requested for ${username}`, 'success');
      await fetchUsers();
    } catch (e) {
      showNotification('Failed to force logout user', 'error');
      console.error(e);
    }
  };

  const revokeUserAccess = async (userId, username) => {
    if (!confirm(`Revoke access for ${username}? This will unapprove the user.`)) return;
    try {
      await apiPatch(`/api/users/${userId}/unapprove`, {});
      showNotification(`✅ Revoked access for ${username}`, 'success');
      await fetchUsers();
    } catch (e) {
      showNotification('Failed to revoke user access', 'error');
      console.error(e);
    }
  };

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Render active tab
  const renderActiveTab = () => {
    const stats = {
      totalRevenue: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalSales: invoices.length,
      lowStockCount: products.filter(p => p.quantity > 0 && p.quantity < p.minStock).length
    };

    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity < p.minStock);

    switch (tab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={stats}
            recentActivity={recentActivity}
            lowStockProducts={lowStockProducts}
            onNavigate={handleTabChange}
            onAddProduct={() => handleTabChange('products')}
            onAddCustomer={() => handleTabChange('customers')}
            canEdit={canEdit()}
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        );

      case 'pos':
        return (
          <POSSystem 
            products={products}
            customers={customers}
            cart={cart}
            onAddToCart={addToCart}
            onUpdateCartItem={updateCartItem}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={selectCustomer}
            onAddCustomer={addCustomer}
            onCheckout={handleCheckout}
            isOnline={isOnline}
            companyInfo={companyInfo}
            cartErrors={cartErrors}
            currentUser={currentUser}
          />
        );

      case 'products':
        return (
          <ProductsList
            products={products}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
            onUploadPhoto={uploadProductPhoto}
            onDeletePhoto={deleteProductPhoto}
            onRefresh={refreshProducts}
            isRefreshing={isRefreshingProducts}
            lastRefreshTime={productsLastRefresh}
            canEdit={canEdit()}
            canDelete={canDelete()}
            canViewProfit={canViewProfit()}
          />
        );

      case 'inventory':
        return (
          <StockManagement 
            products={products}
            onUpdateProduct={updateProduct}
            canEdit={canEdit()}
          />
        );

      case 'customers':
        return (
          <CustomersList
            customers={customers}
            onAddCustomer={addCustomer}
            onUpdateCustomer={updateCustomer}
            onDeleteCustomer={deleteCustomer}
            onViewHistory={getCustomerPurchases}
            onRefresh={refreshCustomers}
            isRefreshing={isRefreshingCustomers}
            lastRefreshTime={customersLastRefresh}
            canEdit={canEdit()}
            canDelete={canDelete()}
          />
        );

      case 'invoices':
        return (
          <InvoicesList
            invoices={invoices}
            onDeleteInvoice={deleteInvoice}
            onExportPDF={handleExportPDF}
            onShareWhatsApp={handleShareWhatsApp}
            onRefresh={refreshInvoices}
            isRefreshing={isRefreshingInvoices}
            lastRefreshTime={invoicesLastRefresh}
            canDelete={canDelete()}
          />
        );

      case 'analytics':
        return (
          <AnalyticsPage 
            analyticsData={analyticsData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            canViewProfit={canViewProfit()}
          />
        );

      case 'reports':
        return (
          <Reports 
            invoices={invoices}
            products={products}
            customers={customers}
            canViewProfit={canViewProfit()}
          />
        );

      case 'returns':
        return (
          <Returns
            currentUser={currentUser}
            isAdmin={isAdmin}
            userRole={userRole}
            showNotification={showNotification}
          />
        );

      case 'expenses':
        return (
          <Expenses
            currentUser={currentUser}
            showNotification={showNotification}
            canEdit={canEdit()}
            canDelete={canDelete()}
          />
        );

      case 'exports':
        if (!isAdmin) {
          return <div className="error-message">Admin access required</div>;
        }
        return (
          <ExportData
            showNotification={showNotification}
          />
        );

      case 'audit':
        if (!isAdmin) {
          return <div className="error-message">Admin access required</div>;
        }
        return <AuditLogs />;

      case 'users':
        if (!isAdmin) {
          return <div className="error-message">Admin access required</div>;
        }
        return (
          <UsersList
            users={users}
            currentUser={currentUser}
            isAdmin={isAdmin}
            userRole={userRole}
            isOnline={isOnline}
            onCreateUser={createUser}
            onResetPassword={resetUserPassword}
            onApproveUser={approveUser}
            onDeleteUser={deleteUser}
            onChangeRole={changeUserRole}
            onForceLogout={forceLogoutUser}
            onRevokeAccess={revokeUserAccess}
            onRefreshUsers={fetchUsers}
            onLogout={logout}
            onUpdateUserPhoto={handleUpdateUserPhoto}
            onDeleteUserPhoto={handleDeleteUserPhoto}
          />
        );

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="app">
      <Sidebar 
        activeTab={tab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        isAdmin={isAdmin}
        userRole={userRole}
        onLogout={logout}
      />

      <div className="app-main">
        <main className="app-content">
          {renderActiveTab()}
        </main>
      </div>

      {notification && (
        <Toast 
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {showInstallPrompt && (
        <div className="pwa-install-banner">
          <div className="pwa-banner-content">
            <span>📱 Install app for offline access and better experience</span>
            <div className="pwa-banner-actions">
              <button onClick={installPWA}>Install</button>
              <button onClick={dismissInstallPrompt}>Later</button>
            </div>
          </div>
        </div>
      )}
      <SpeedInsights />
      <Analytics />
    </div>
  );
}
