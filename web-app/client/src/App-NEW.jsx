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
import { API, apiPost, apiPatch } from './utils/api';
import { generatePublicInvoiceUrl, generateWhatsAppLink } from './services/invoiceService';
import './styles.css';

export default function App() {
  console.log('🚀 App component rendering...');

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

  // Custom hooks
  const { 
    isAuthenticated, 
    isAdmin, 
    currentUser, 
    userRole,
    login, 
    logout,
    register,
    profilePhoto
  } = useAuth();

  const { isOnline, offlineTransactions, syncOfflineData } = useOffline(isAuthenticated);
  
  const { products, loading: productsLoading, fetchProducts, addProduct, updateProduct, deleteProduct, uploadProductPhoto } = 
    useProducts(isOnline, isAuthenticated);
  
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerPurchases } = 
    useCustomers(isOnline, isAuthenticated);
  
  const { invoices, fetchInvoices, createInvoice, deleteInvoice, filterInvoices } = 
    useInvoices(isOnline, isAuthenticated, tab);
  
  const { cart, addToCart, updateCartItem, removeFromCart, clearCart, selectedCustomer, selectCustomer } = 
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

  // Track tab changes
  const handleTabChange = (newTab) => {
    setTab(newTab);
    trackEvent('navigation', `tab_${newTab}`);
    trackPageView(`${newTab} Tab`);
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
      const res = await generateWhatsAppLink(invoice.id || invoice._id, currentUser?.username, companyInfo);
      if (res?.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      } else if (res?.publicUrl) {
        const message = `Invoice #${invoice.id} - Total: ₹${invoice.total} - ${res.publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        const message = `Invoice #${invoice.id} - Total: ₹${invoice.total}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (e) {
      showNotification('Failed to create WhatsApp link', 'error');
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
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const approveUser = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/approve`, { method: 'PATCH' });
      if (res.ok) {
        showNotification('✅ User approved successfully!', 'success');
        await fetchUsers();
      }
    } catch (error) {
      showNotification('Failed to approve user', 'error');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
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
    return <Login onLogin={login} onRegister={register} />;
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
            recentActivity={[]}
            lowStockProducts={lowStockProducts}
            onNavigate={handleTabChange}
            onAddProduct={() => {}}
            onAddCustomer={() => {}}
            canEdit={canEdit()}
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
            onCheckout={handleCheckout}
            isOnline={isOnline}
            companyInfo={companyInfo}
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
            canEdit={canEdit()}
            canDelete={canDelete()}
            canViewProfit={canViewProfit()}
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
            onExportCSV={() => { window.open(API('/api/backup/invoices-csv'), '_blank'); showNotification('Downloading invoices CSV...', 'success') }}
            onExportPDF={() => { window.open(API('/api/backup/json'), '_blank'); showNotification('Downloading JSON backup...', 'success') }}
            canViewProfit={canViewProfit()}
          />
        );

      case 'users':
        if (!isAdmin) {
          return <div className="error-message">Admin access required</div>;
        }
        return (
          <UsersList 
            users={users}
            currentUser={currentUser}
            onApproveUser={approveUser}
            onDeleteUser={deleteUser}
            onForceLogout={forceLogoutUser}
            onRevokeAccess={revokeUserAccess}
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
        profilePhoto={profilePhoto}
        indiaTime={indiaTime}
        indiaDate={indiaDate}
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
