import React, { useState, useEffect } from 'react';
import { initAnalytics, trackPageView, trackEvent } from './analytics';
import Login from './Login';
import Toast from './components/Common/Toast';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import POSSystem from './components/POS/POSSystem';
import ProductsList from './components/Products/ProductsList';
import CustomersList from './components/Customers/CustomersList';
import InvoicesList from './components/Invoices/InvoicesList';
import Analytics from './components/Analytics/Analytics';
import Reports from './components/Reports/Reports';
import UsersList from './components/Users/UsersList';
import AuditLogs from './components/AuditLogs/AuditLogs';
import StockManagement from './components/Inventory/StockManagement';
import Returns from './components/Returns/Returns';
import Expenses from './components/Expenses/Expenses';
import ExportData from './components/ExportData/ExportData';
import { useAuth } from './hooks/useAuth';

import { useProducts } from './hooks/useProducts';
import { useCustomers } from './hooks/useCustomers';
import { useInvoices } from './hooks/useInvoices';
import { useCart } from './hooks/useCart';
import { useAnalytics } from './hooks/useAnalytics';
import { usePWA } from './hooks/usePWA';
import { useOffline } from './hooks/useOffline';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DEFAULT_GST, GST_PERCENT, PAYMENT_MODES } from './constants';
import { API, apiPost, apiPatch, getAuthHeaders } from './utils/api';
import { generatePublicInvoiceUrl, generateWhatsAppLink } from './services/invoiceService';
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
  
  // Live India time
  const [indiaTime, setIndiaTime] = useState(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-IN', { 
      hour: 'numeric', minute: 'numeric', second: 'numeric', 
      hour12: true, timeZone: 'Asia/Kolkata' 
    }).format(now);
  });
  const [indiaDate, setIndiaDate] = useState(() => {
    const now = new Date();
    return new Intl.DateTimeFormat('en-IN', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
      timeZone: 'Asia/Kolkata' 
    }).format(now);
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

  const { isOnline, offlineTransactions, syncOfflineData } = useOffline(isAuthenticated);
  
  const { products, loading: productsLoading, fetchProducts, addProduct, updateProduct, deleteProduct, uploadProductPhoto, deleteProductPhoto } = 
    useProducts(isOnline, isAuthenticated, currentUser, isAdmin);
  
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerPurchases } = 
    useCustomers(isOnline, isAuthenticated);
  
  const { invoices, fetchInvoices, createInvoice, deleteInvoice, filterInvoices } = 
    useInvoices(isOnline, isAuthenticated, tab);
  
  const { cart, addToCart, setQuantity: updateCartItem, removeFromCart, clearCart, selectedCustomer, setSelectedCustomer: selectCustomer, errors: cartErrors } = 
    useCart(products);
  
  const { analyticsData, dateRange, setDateRange, fetchAnalyticsData } = 
    useAnalytics(isOnline, tab);
  
  const { showInstallPrompt, installPWA, dismissInstallPrompt } = usePWA();

  // Permission helpers
  const canViewProfit = () => userRole === 'admin' || userRole === 'manager' || isAdmin;
  const canEdit = () => userRole === 'admin' || userRole === 'manager' || isAdmin;
  const canDelete = () => userRole === 'admin' || isAdmin;

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

  // Clock update
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setIndiaTime(new Intl.DateTimeFormat('en-IN', { 
        hour: 'numeric', minute: 'numeric', second: 'numeric', 
        hour12: true, timeZone: 'Asia/Kolkata' 
      }).format(now));
      setIndiaDate(new Intl.DateTimeFormat('en-IN', { 
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', 
        timeZone: 'Asia/Kolkata' 
      }).format(now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
  const handleExportPDF = async (invoice) => {
    try {
      const res = await generatePublicInvoiceUrl(invoice.id || invoice._id, currentUser?.username, companyInfo);
      if (res?.publicUrl) {
        // Open printable page and trigger print via query param
        window.open(res.publicUrl + '?print=1', '_blank');
        showNotification('Opening printable invoice...', 'success');
      } else {
        showNotification('Failed to generate printable invoice', 'error');
      }
    } catch (e) {
      showNotification('Failed to generate printable invoice', 'error');
      console.error(e);
    }
  };

  const handleShareWhatsApp = async (invoice) => {
    try {
      // Validate customer phone exists
      if (!invoice.customerPhone || invoice.customerPhone.trim() === '') {
        showNotification('❌ Cannot send WhatsApp: Customer phone number is missing', 'error');
        return;
      }

      const res = await generateWhatsAppLink(invoice.id || invoice._id, currentUser?.username, companyInfo);
      if (res?.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
        showNotification('✅ Opening WhatsApp...', 'success');
      } else if (res?.publicUrl) {
        // Fallback: open WhatsApp without pre-filled number
        const message = `Invoice #${invoice.billNumber || invoice.id} - Total: ₹${invoice.grandTotal || invoice.total} - ${res.publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        showNotification('⚠️ Opening WhatsApp (please select contact manually)', 'warning');
      } else {
        showNotification('❌ Failed to create WhatsApp link', 'error');
      }
    } catch (e) {
      showNotification('❌ Failed to create WhatsApp link: ' + (e.message || 'Unknown error'), 'error');
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
            canDelete={canDelete()}
          />
        );

      case 'analytics':
        return (
          <Analytics 
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
            onCreateUser={createUser}
            onResetPassword={resetUserPassword}
            onApproveUser={approveUser}
            onDeleteUser={deleteUser}
            onForceLogout={forceLogoutUser}
            onRevokeAccess={revokeUserAccess}
            onRefreshUsers={fetchUsers}
          />
        );

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="app">
      <Header 
        activeTab={tab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        isAdmin={isAdmin}
        userRole={userRole}
        onLogout={logout}
        onUpdateUserPhoto={handleUpdateUserPhoto}
        onDeleteUserPhoto={handleDeleteUserPhoto}
        isOnline={isOnline}
        offlineCount={offlineTransactions.length}
      />

      <main className="app-content">
        {renderActiveTab()}
      </main>

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
    </div>
  );
}
