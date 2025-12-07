import React, {useEffect, useState, useRef} from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { initAnalytics, trackPageView, trackEvent, trackUserInteraction } from './analytics'
import Login from './Login'
import Icon from './Icon'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { DEFAULT_GST, GST_PERCENT, fmt1, fmt0, formatCurrency, formatCurrency0, PAYMENT_MODES, PAYMENT_MODE_LABELS, validateSplitPayment } from './constants'

// 26:07 Electronics - Inventory Management System
const API = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  return baseUrl + path
}

export default function App(){
  // PWA and Offline functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [offlineTransactions, setOfflineTransactions] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastDataRefresh, setLastDataRefresh] = useState(null)
  // Live India time & date display (Asia/Kolkata, 12-hour format)
  const [indiaTime, setIndiaTime] = useState(() => {
    const now = new Date()
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' }).format(now)
  })
  const [indiaDate, setIndiaDate] = useState(() => {
    const now = new Date()
    return new Intl.DateTimeFormat('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(now)
  })
  
  const [tab, setTab] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [cart, setCart] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState({})
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newProduct, setNewProduct] = useState({name:'', quantity:0, price:0, costPrice:0, hsnCode:'9999', minStock:10, serialNo:'', barcode:''})
  const [newCustomer, setNewCustomer] = useState({name:'', phone:'', address:'', place:'', pincode:'', gstin:''})
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const placeDebounceRef = useRef(null);
  // Disable the full-screen loading overlay by default so users enter the app
  // immediately. The app will still fetch data in background and show localized
  // loading indicators where appropriate.
  const [loading, setLoading] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.CASH)
  const [showBill, setShowBill] = useState(false)
  const [lastBill, setLastBill] = useState(null)
  const [searchQuery, setSearchQuery] = useState('') // Product search in POS
  const [taxRate, setTaxRate] = useState(GST_PERCENT) // Fixed 18% GST
  const [companyInfo, setCompanyInfo] = useState({
    name: '26:07 Electronics',
    address: 'Electronics Plaza, Tech Street, City - 560001',
    phone: '7594012761',
    email: 'support@2607electronics.com',
    gstin: '29AABCU9603R1ZX',
    logo: '⚡'
  })
  
  // Authentication for modifications
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState('cashier') // 'admin', 'manager', 'cashier' (removed viewer)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [users, setUsers] = useState([])
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [showRegisterConfirmation, setShowRegisterConfirmation] = useState(false)
  const [showLoginPage, setShowLoginPage] = useState(true) // Toggle between login/register page
  // Global error guard: if the app hits an unhandled error, show an overlay
  const [globalError, setGlobalError] = useState(null)
  const [auditLogs, setAuditLogs] = useState([]) // Audit trail logs
  const [showCustomerHistory, setShowCustomerHistory] = useState(false)
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null)
  const [customerPurchases, setCustomerPurchases] = useState([])
  
  // New advanced features
  const [notification, setNotification] = useState(null)
  const [showStockAlert, setShowStockAlert] = useState(false)
  const [showSalesChart, setShowSalesChart] = useState(false)
  const [productFilter, setProductFilter] = useState('all') // 'all', 'low-stock', 'out-of-stock', 'high-profit'
  const [sortBy, setSortBy] = useState('name') // 'name', 'stock', 'price', 'profit'
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalAddQty, setModalAddQty] = useState(1)
  const [recentActivity, setRecentActivity] = useState([])
  
  // Invoice filters
  const [invoiceDateFilter, setInvoiceDateFilter] = useState('all') // 'all', 'today', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Barcode scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [scannerMode, setScannerMode] = useState('product') // 'product' or 'pos'
  const [scannedBarcode, setScannedBarcode] = useState('')
  
  // Barcode & Photo management
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [barcodeProduct, setBarcodeProduct] = useState(null)
  const [barcodeImage, setBarcodeImage] = useState(null)
  const [qrCodeImage, setQrCodeImage] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pendingUploads, setPendingUploads] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pendingUploads') || '[]') } catch(e) { return [] }
  })
  const [localProductPhotos, setLocalProductPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('localProductPhotos') || '{}') } catch(e) { return {} }
  })
  const [localUserPhotos, setLocalUserPhotos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('localUserPhotos') || '{}') } catch(e) { return {} }
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  // Loyalty UI removed
  const [cartOpen, setCartOpen] = useState(false)
  const cartTotal = cart.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
  const cartCount = cart.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
  const [loyaltyFetchError, setLoyaltyFetchError] = useState(null) // left for compatibility but currently unused
  const [transactionsView, setTransactionsView] = useState('cards')
  // Loyalty preview and referral removed
  // Profile photo (per-user). We'll prefer per-user `localUserPhotos[userId]` or server URL.
  const [profilePhoto, setProfilePhoto] = useState(null)
  
  // Dark mode removed — UI will always use the default (light) theme.

  // Install global error handlers so the app doesn't drop into a blank page
  useEffect(() => {
    function onErr(msg, source, lineno, colno, err) {
      try { setGlobalError({ message: msg || (err && err.message) || 'Unknown error', stack: (err && err.stack) || `${source}:${lineno}:${colno}` }) } catch(e) {}
      // return false to let default handler run
      return false
    }

    function onUnhandledRejection(e) {
      try { setGlobalError({ message: e?.reason?.message || 'Unhandled promise rejection', stack: e?.reason?.stack || String(e) }) } catch(err) {}
    }

    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])
  
  // Checkout loading state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Expense tracking states
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Multiple payment methods
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [showMobileMore, setShowMobileMore] = useState(false);
  // Mobile sidebar overlay (no collapse toggle — sidebar is always expanded)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  // Force the sidebar to be expanded by default. We persist this expansion by
  // clearing any legacy `sidebarCollapsed` localStorage entry and not reading it.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [upiAmount, setUpiAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],
    lowStock: [],
    revenueSummary: {}
  });
  // D(days) for analytics requests
  const [analyticsDateRange, setAnalyticsDateRange] = useState(30);
  
  // Admin password from secure environment variable
  // New admin password set per request. NOTE: hard-coding credentials is insecure
  // for production — consider storing this in environment variables / secrets.
  // Prefer explicit build-time secret. Do NOT keep a fallback in source for security.
  // If VITE_ADMIN_PASSWORD is not provided we disable the local fallback and require
  // server-based admin authentication. This prevents accidental exposure of creds.
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || null

  // Developer-friendly notice: we intentionally disable a plaintext fallback.
  // If you're running locally without `VITE_ADMIN_PASSWORD` set, admin actions
  // requiring a password will fall back to server auth only.
  useEffect(() => {
    if (!ADMIN_PASSWORD) {
      // Local admin fallback is disabled. Use server-auth or set VITE_ADMIN_PASSWORD for local testing.
    }
  }, []);

  // Update body class when collapsing sidebar so CSS can react to layout changes
  useEffect(() => {
    // Ensure any legacy collapsed state is removed from localStorage so new
    // default is always expanded for all users after this change.
    try { localStorage.removeItem('sidebarCollapsed') } catch (e) {}

    try {
      if (sidebarCollapsed) document.body.classList.add('sidebar-collapsed')
      else document.body.classList.remove('sidebar-collapsed')
    } catch(e) {}
  }, [sidebarCollapsed])

  // Helper function to track tab changes
  const handleTabChange = (newTab) => {
    setTab(newTab);
    trackUserInteraction('navigation', `tab_${newTab}`);
    trackPageView(`${newTab} Tab`);
  };

  // Ensure legacy body class is removed on first mount so the sidebar is visible
  useEffect(() => {
    try { document.body.classList.remove('sidebar-collapsed') } catch (e) {}
  }, []);

  // Permission helper functions
  const canViewProfit = () => {
    // Admin and manager can see profit/cost data, cashier cannot
    return userRole === 'admin' || userRole === 'manager' || isAdmin;
  };

  const canEdit = () => {
    // Admin and manager can edit
    return userRole === 'admin' || userRole === 'manager' || isAdmin;
  };

  const canDelete = () => {
    // Only admin can delete
    return userRole === 'admin' || isAdmin;
  };

  const canMakeSales = () => {
    // All roles can make sales (admin, manager, cashier)
    return isAuthenticated;
  };

  // Global error handler to prevent app crashes
  useEffect(() => {

    const handleError = (event) => {
      console.error('Global error caught:', event.error);
      showNotification('❌ An unexpected error occurred. Please refresh the page if problems persist.', 'error');
      event.preventDefault();
    };

    const handleRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      showNotification('❌ A background operation failed. The app should continue working normally.', 'warning');
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // separate effect just for India clock updates
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setIndiaTime(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' }).format(now))
      setIndiaDate(new Intl.DateTimeFormat('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' }).format(now))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // reset modal add-quantity whenever a product details modal is opened
  useEffect(() => {
    if (selectedProduct) setModalAddQty(1)
  }, [selectedProduct])

  // Validate sessionVersion with server when online — force logout if session invalidated remotely
  useEffect(() => {
    if (!isAuthenticated || !isOnline || !currentUser || !currentUser.username) return

    const stored = localStorage.getItem('currentUser')
    if (!stored) return
    let storedUser
    try { storedUser = JSON.parse(stored) } catch(e) { return }

    if (!storedUser.sessionVersion) return // nothing to validate for local-only accounts

    (async () => {
      try {
        const res = await fetch(API(`/api/users/${encodeURIComponent(storedUser.username)}/session`))
        if (!res.ok) return
        const j = await res.json()
        if (j.sessionVersion && j.sessionVersion !== storedUser.sessionVersion) {
          showNotification('⚠️ Your session was invalidated — logging out', 'warning')
          handleLogout()
        }
      } catch(e) {}
    })()
    if (!isAuthenticated || !isOnline || !currentUser) return

    const intervalId = setInterval(async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('currentUser') || '{}')
        if (!stored || !stored.sessionVersion) return
        const res = await fetch(API(`/api/users/${encodeURIComponent(stored.username)}/session`))
        if (!res.ok) return
        const j = await res.json()
        if (j.sessionVersion && j.sessionVersion !== stored.sessionVersion) {
          showNotification('⚠️ Your session was invalidated — logging out', 'warning')
          handleLogout()
        }
      } catch(e) {}
    }, 30000) // check every 30 seconds

    return () => clearInterval(intervalId)
  }, [isAuthenticated, isOnline, currentUser])

  // Check authentication on mount (permanent session until logout)
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    const storedIsAdmin = localStorage.getItem('isAdmin')
    const storedRole = localStorage.getItem('userRole')
    
    if (storedUser) {
      // migrate any legacy global profilePhoto from localStorage into per-user cache
      try {
        const globalPhoto = localStorage.getItem('profilePhoto')
        if (globalPhoto) {
          const userObj = JSON.parse(storedUser)
          const uid = userObj && (userObj.id || userObj._id || userObj.userId)
          if (uid) {
            const existing = localUserPhotos && localUserPhotos[uid]
            if (!existing) setLocalUserPhotos(u => ({ ...(u||{}), [uid]: globalPhoto }))
            // remove legacy key to avoid confusion
            localStorage.removeItem('profilePhoto')
          }
        }
      } catch(e) {}
      setIsAuthenticated(true)
      const parsed = JSON.parse(storedUser)
      setCurrentUser(parsed)
      
      // Load user photo from cache or server
      try {
        const uid = parsed && (parsed.id || parsed._id || parsed.userId)
        if (uid) {
          // First check local cache
          const cachedPhoto = localUserPhotos && localUserPhotos[uid]
          if (cachedPhoto) {
            setProfilePhoto(cachedPhoto)
          } else if (parsed.photo) {
            // Use photo from login response
            setProfilePhoto(parsed.photo)
            setLocalUserPhotos(u => ({ ...(u || {}), [uid]: parsed.photo }))
          } else {
            // Try to fetch from server
            fetch(API(`/api/users/${uid}/photo`))
              .then(res => {
                if (res.ok) {
                  const photoUrl = API(`/api/users/${uid}/photo`)
                  setProfilePhoto(photoUrl)
                  setLocalUserPhotos(u => ({ ...(u || {}), [uid]: photoUrl }))
                }
              })
              .catch(e => {})
          }
        }
      } catch(e) {}
      
      const isAdminStored = (storedIsAdmin === 'true') || (storedRole === 'admin')
      setIsAdmin(isAdminStored)
      setUserRole(storedRole || 'cashier') // Default to cashier if no role stored

      // Fetch users if admin
      if (isAdminStored) {
        fetchUsers()
      }
    }
  }, [])

  // Persist current user's profilePhoto into per-user cache so different users
  // don't overwrite each other. We keep a localUserPhotos map that is persisted
  // separately (see useEffect for localUserPhotos persistence).
  useEffect(() => {
    try {
      const uid = currentUser && (currentUser.id || currentUser._id || currentUser.userId)
      if (!uid) return
      if (profilePhoto) {
        setLocalUserPhotos(u => ({ ...(u || {}), [uid]: profilePhoto }))
      } else {
        setLocalUserPhotos(u => { const copy = { ...(u || {}) }; delete copy[uid]; return copy })
      }
    } catch(e) {}
  }, [profilePhoto, currentUser])

  // Loyalty card: fetch and show ATM-style loyalty card for a customer
  // Loyalty fetch function removed

  // persist local photo caches and pending uploads
  useEffect(() => { try { localStorage.setItem('pendingUploads', JSON.stringify(pendingUploads || [])) } catch(e) {} }, [pendingUploads])
  useEffect(() => { try { localStorage.setItem('localProductPhotos', JSON.stringify(localProductPhotos || {})) } catch(e) {} }, [localProductPhotos])
  useEffect(() => { try { localStorage.setItem('localUserPhotos', JSON.stringify(localUserPhotos || {})) } catch(e) {} }, [localUserPhotos])

  // When we become online and user is authenticated, sync local base64 avatar to server
  useEffect(() => {
    const trySync = async () => {
      if (!isOnline || !isAuthenticated || !currentUser) return
      if (!profilePhoto) {
        // try to load server photo if available
        const id = currentUser.id || currentUser._id || currentUser.userId
        if (!id) return
        // If there's a cached local user photo, use that first
        if (localUserPhotos && localUserPhotos[id]) {
          setProfilePhoto(localUserPhotos[id])
          return
        }
        try {
          const res = await fetch(API(`/api/users/${id}/photo`), { method: 'GET' })
          if (res.ok) {
            setProfilePhoto(API(`/api/users/${id}/photo`))
          }
        } catch (e) {
          // ignore
        }
        return
      }

      // if profilePhoto is a data URL, upload it to server
      if (profilePhoto && profilePhoto.startsWith('data:')) {
        try {
          const id = currentUser.id || currentUser._id || currentUser.userId
          if (!id) return
          // Convert dataURL to blob
          const blob = await (await fetch(profilePhoto)).blob()
          await uploadProfilePhoto(new File([blob], `avatar-${Date.now()}.png`, { type: blob.type }))
        } catch (e) {
          // ignore sync errors — we already persist to localStorage
          // Profile photo sync failed
        }
      }
    }
    
    // Try to process any Pending uploads whenever we become online
    const processPending = async () => {
      if (!isOnline || !pendingUploads || pendingUploads.length === 0) return
      // iterate through queue sequentially
      for (const item of [...pendingUploads]) {
        try {
          if (item.type === 'product') {
            // decode dataURL to blob
            const blob = await (await fetch(item.fileData)).blob()
            const file = new File([blob], item.fileName || `prod-${item.id}.png`, { type: item.mime || blob.type })
            const fd = new FormData(); fd.append('photo', file)
            fd.append('userId', currentUser?.id || '')
            fd.append('username', isAdmin ? 'admin' : currentUser?.username || '')
            const res = await fetch(API(`/api/products/${item.id}/photo`), { method: 'POST', body: fd })
            if (res.ok) {
              // remove pending item and update state
              setPendingUploads(q => q.filter(p => p !== item))
              setLocalProductPhotos(lp => {
                const copy = { ...lp }
                delete copy[item.id]
                return copy
              })
              fetchProducts()
            }
          } else if (item.type === 'user') {
            const blob = await (await fetch(item.fileData)).blob()
            const file = new File([blob], item.fileName || `user-${item.id}.png`, { type: item.mime || blob.type })
            const fd = new FormData(); fd.append('photo', file)
            fd.append('userId', item.id)
            fd.append('username', item.username || '')
            const res = await fetch(API(`/api/users/${item.id}/photo`), { method: 'POST', body: fd })
            if (res.ok) {
              setPendingUploads(q => q.filter(p => p !== item))
              setLocalUserPhotos(u => { const copy = { ...u }; delete copy[item.id]; return copy })
              fetchUsers()
            }
          } else if (item.type === 'profile') {
            const blob = await (await fetch(item.fileData)).blob()
            const file = new File([blob], item.fileName || `profile-${item.id}.png`, { type: item.mime || blob.type })
            // upload with current user context
            const fd = new FormData(); fd.append('photo', file)
            fd.append('userId', item.id)
            fd.append('username', currentUser?.username || '')
            const res = await fetch(API(`/api/users/${item.id}/photo`), { method: 'POST', body: fd })
            if (res.ok) {
              setPendingUploads(q => q.filter(p => p !== item))
              // update profilePhoto URL if successful (server path)
                      const serverPath = API(`/api/users/${item.id}/photo`)
                      setProfilePhoto(serverPath)
                      setLocalUserPhotos(u => ({ ...(u||{}), [item.id]: serverPath }))
            }
          }
        } catch (e) {
          // Failed to process pending upload
          // keep item so it will retry later
        }
      }
    }
    processPending()

    trySync()
  }, [isOnline, isAuthenticated, currentUser, profilePhoto])

  // When a user signs in or the local cache changes, ensure profilePhoto reflects the current user's image
  useEffect(() => {
    try {
      if (!currentUser) { setProfilePhoto(null); return }
      const uid = currentUser.id || currentUser._id || currentUser.userId
      if (!uid) { setProfilePhoto(null); return }
      if (localUserPhotos && localUserPhotos[uid]) {
        setProfilePhoto(localUserPhotos[uid])
      } else {
        // try server path only when online to avoid broken image URLs
        if (isOnline) {
          (async () => {
            try {
              const resp = await fetch(API(`/api/users/${uid}/photo`), { method: 'GET' })
              if (resp.ok) setProfilePhoto(API(`/api/users/${uid}/photo`))
              else setProfilePhoto(null)
            } catch (e) { setProfilePhoto(null) }
          })()
        } else {
          setProfilePhoto(null)
        }
      }
    } catch (e) {
      // Failed to initialize profilePhoto for user
    }
  }, [currentUser, localUserPhotos])

  // PWA Install Prompt Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Online/Offline Status Handler
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      try {
        // Only notify & try to sync if there's something to sync
        if (window.offlineStorage) {
          const tx = await window.offlineStorage.getOfflineTransactions()
          if (tx && tx.length > 0) {
            showNotification('🌐 Back online! Syncing data...', 'success')
            syncOfflineData()
          }
        }
      } catch (e) {
        // Error while checking for offline transactions
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      showNotification('📴 You are offline. Transactions will be saved locally.', 'warning')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize offline storage and load cached data
  useEffect(() => {
    if (typeof window !== 'undefined' && window.offlineStorage) {
      loadCachedData()
      loadOfflineTransactions()
    }
  }, [isAuthenticated])

  // Offline data refresh mechanism
  useEffect(() => {
    if (!isAuthenticated) return

    let refreshInterval
    
    if (!isOnline) {
      // When offline, refresh cached data every 30 seconds
      refreshInterval = setInterval(async () => {
        // Refreshing offline data from cache
        await Promise.all([
          fetchProducts(),
          fetchCustomers(), 
          fetchInvoices(),
          fetchStats()
        ])
        await loadOfflineTransactions()
        setLastDataRefresh(new Date())
      }, 30000) // 30 seconds
    } else {
      // When online, clear any offline refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isOnline, isAuthenticated])

  // Auto-refresh data when coming back online
  useEffect(() => {
    if (isOnline && isAuthenticated) {
      Promise.all([fetchProducts(), fetchCustomers(), fetchInvoices(), fetchStats()])
        .then(() => {
          // Data refreshed successfully
        })
        .catch(error => {
          // Failed to refresh data
        })
    }
  }, [isOnline, isAuthenticated])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check if user is not typing in input/textarea
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      
      // Ctrl/Cmd + Shortcuts
      if ((e.ctrlKey || e.metaKey) && !isInputActive) {
        switch(e.key.toLowerCase()) {
          case 'n': // New Product
            e.preventDefault();
            if (canEdit()) setShowAddProduct(true);
            break;
          case 'k': // New Customer
            e.preventDefault();
            if (canEdit()) setShowAddCustomer(true);
            break;
          case 'h': // Help/Shortcuts
            e.preventDefault();
            alert('Keyboard Shortcuts:\n\nCtrl+N: New Product\nCtrl+K: New Customer\nCtrl+F: Search Products\nCtrl+H: Show Shortcuts\nAlt+1-7: Switch Tabs\nF1: Dashboard\nF2: POS\nF3: Products\nF4: Customers\nF5: Invoices\nF6: Analytics\nF7: Reports');
            break;
          case 'f': // Focus search
            e.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Search"]');
            if (searchInput) searchInput.focus();
            break;
        }
      }
      
      // Alt + Number shortcuts for tabs
      if (e.altKey && !isInputActive) {
        e.preventDefault();
        const tabMap = {
          '1': 'dashboard',
          '2': 'pos',
          '3': 'products',
          '4': 'customers',
          '5': 'invoices',
          '6': 'analytics',
          '7': 'reports'
        };
        if (tabMap[e.key]) {
          setTab(tabMap[e.key]);
        }
      }
      
      // F-key shortcuts
      if (!e.ctrlKey && !e.altKey && !isInputActive) {
        switch(e.key) {
          case 'F1':
            e.preventDefault();
            setTab('dashboard');
            break;
          case 'F2':
            e.preventDefault();
            setTab('pos');
            break;
          case 'F3':
            e.preventDefault();
            setTab('products');
            break;
          case 'F4':
            e.preventDefault();
            setTab('customers');
            break;
          case 'F5':
            e.preventDefault();
            setTab('invoices');
            break;
          case 'F6':
            e.preventDefault();
            setTab('analytics');
            break;
          case 'F7':
            e.preventDefault();
            setTab('reports');
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAuthenticated, userRole, canEdit]); // Dependencies for permission checks

  async function fetchUsers() {
    try {
      const res = await fetch(API('/api/users'))
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch(e) {
      // Error fetching users
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch(API('/api/audit-logs?limit=100'))
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data)
      }
    } catch(e) {
      // Error fetching audit logs
    }
  }

  // PWA Install Prompt & Initial Data Load
  useEffect(()=>{ 
    // Initialize analytics
    initAnalytics();
    trackPageView('Inventory Management App');
    
    Promise.all([fetchProducts(), fetchCustomers(), fetchInvoices(true), fetchStats()])
      .then(() => {
        trackEvent('data_loaded', 'initialization', 'initial_load');
      })
      .finally(() => setLoading(false))
  }, [])
  
  // Check if user account is still valid (not deleted by admin)
  async function checkUserValidity() {
    if (!isAuthenticated || isAdmin) return true // Admin always valid
    
    try {
      const res = await fetch(API(`/api/users/check/${currentUser.id}`))
      const data = await res.json()
      
      if (!res.ok || !data.exists) {
        // User account was deleted by admin
        alert('Your account has been removed by the administrator. You will be logged out.')
        handleLogout()
        return false
      }
      
      if (!data.approved) {
        // User account was un-approved by admin
        alert('Your account approval has been revoked by the administrator. You will be logged out.')
        handleLogout()
        return false
      }
      
      return true
    } catch(e) {
      return true // Don't interrupt user on network errors
    }
  }
  
  // Check user validity periodically (every 30 seconds)
  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      const interval = setInterval(() => {
        checkUserValidity()
      }, 30000) // Check every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, isAdmin, currentUser])

  async function fetchProducts(){
    try {
      if (isOnline) {
        const res = await fetch(API('/api/products'))
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
          // Cache fresh data
          if (window.offlineStorage) {
            await window.offlineStorage.cacheProducts(data)
          }
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cachedProducts = await window.offlineStorage.getCachedProducts()
          if (cachedProducts.length > 0) {
            setProducts(cachedProducts)
          }
        }
      }
    } catch(e) { 
      // Fallback to cached data on error
      if (window.offlineStorage) {
        const cachedProducts = await window.offlineStorage.getCachedProducts()
        if (cachedProducts.length > 0) {
          setProducts(cachedProducts)
        }
      }
    }
  }
  async function fetchCustomers(){
    try {
      if (isOnline) {
        const res = await fetch(API('/api/customers'))
        if (res.ok) {
          const data = await res.json()
          setCustomers(data)
          // Cache fresh data
          if (window.offlineStorage) {
            await window.offlineStorage.cacheCustomers(data)
          }
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cachedCustomers = await window.offlineStorage.getCachedCustomers()
          if (cachedCustomers.length > 0) {
            setCustomers(cachedCustomers)
          }
        }
      }
    } catch(e) { 
      // Fallback to cached data on error
      if (window.offlineStorage) {
        const cachedCustomers = await window.offlineStorage.getCachedCustomers()
        if (cachedCustomers.length > 0) {
          setCustomers(cachedCustomers)
        }
      }
    }
  }
  // Fetch invoices. If `force` is false, do not overwrite the currently-displayed
  // invoices while the user has the Invoices tab active. Use `force=true` when
  // the caller needs to ensure the UI shows the latest invoices immediately
  // (for example: after creating a sale or finishing an offline sync).
  async function fetchInvoices(force = false){
    try {
      if (isOnline) {
        const res = await fetch(API('/api/invoices'))
        if (res.ok) {
          const data = await res.json()
          // Only update the visible invoice list when appropriate
          if (force || tab !== 'invoices') {
            // If we are forcing refresh while user is actively viewing the invoices
            // tab, avoid replacing the entire list which can cause a jarring
            // visual re-render. Instead merge new/updated invoices into the
            // existing array: update changed entries and prepend truly new
            // invoices. This keeps the UI stable while still reflecting new
            // data.
            if (force && tab === 'invoices') {
              setInvoices(prev => {
                try {
                  const prevMap = new Map(prev.map(i => [i.id, i]));
                  const dataMap = new Map(data.map(i => [i.id, i]));

                  // Update existing invoices in-place where possible so React
                  // re-uses object refs for unchanged entries and avoids
                  // unnecessary re-renders.
                  const mergedExisting = prev.map(p => dataMap.has(p.id) ? dataMap.get(p.id) : p);

                  // Identify truly new invoices not present in current view
                  const newItems = data.filter(d => !prevMap.has(d.id));

                  // Prepend new items so the newest invoices appear first.
                  return [...newItems, ...mergedExisting];
                } catch (e) {
                  // If anything goes wrong during the merge, fall back to a
                  // full replace to keep data consistent.
                  return data;
                }
              })
            } else {
              setInvoices(data)
            }
          } else {
            // Skipped auto-refresh of invoices while user is viewing the invoices tab
          }

          // Cache fresh data regardless — caching shouldn't affect visible UI
          if (window.offlineStorage) {
            await window.offlineStorage.cacheBills(data)
          }
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cachedBills = await window.offlineStorage.getCachedBills()
          if (cachedBills.length > 0) {
            // When loading from cache, avoid surprising the user if they're actively
            // on the invoices tab unless the operation is forced to update.
            if (tab !== 'invoices' || force) {
              setInvoices(cachedBills)
            } else {
              // Skipped loading cached invoices to avoid replacing user view
            }
          }
        }
      }
    } catch(e) { 
      // Fallback to cached data on error
      if (window.offlineStorage) {
        const cachedBills = await window.offlineStorage.getCachedBills()
        if (cachedBills.length > 0) {
          setInvoices(cachedBills)
        }
      }
    }
  }
  async function fetchStats(){
    try {
      if (isOnline) {
        const res = await fetch(API('/api/stats'))
        if (res.ok) {
          const data = await res.json()
          setStats(data)
          // Cache stats data
          if (window.offlineStorage) {
            await window.offlineStorage.saveSetting('stats', data)
          }
        } else {
          // Failed to fetch stats
        }
      } else {
        // Load cached stats when offline
        if (window.offlineStorage) {
          const cachedStats = await window.offlineStorage.getSetting('stats')
          if (cachedStats) {
            setStats(cachedStats)
          } else {
            // Fallback stats when no cache available
            setStats({
              totalProducts: products.length,
              totalCustomers: customers.length,
              totalSales: invoices.length,
              totalRevenue: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
            })
          }
        }
      }
    } catch(e) { 
      // Fallback to cached stats on error
      if (window.offlineStorage) {
        const cachedStats = await window.offlineStorage.getSetting('stats')
        if (cachedStats) {
          setStats(cachedStats)
        }
      }
    }
  }
  
  async function fetchAnalyticsData(days = 30) {
    try {
      const [topProductsRes, lowStockRes, revenueSummaryRes] = await Promise.all([
        fetch(API(`/api/analytics/top-products?days=${days}&limit=10`)),
        fetch(API('/api/analytics/low-stock')),
        fetch(API(`/api/analytics/revenue-profit?days=${days}`))
      ]);
      
      const data = {
        topProducts: topProductsRes.ok ? await topProductsRes.json() : [],
        lowStock: lowStockRes.ok ? await lowStockRes.json() : [],
        revenueSummary: revenueSummaryRes.ok ? await revenueSummaryRes.json() : {}
      };
      
      setAnalyticsData(data);
    } catch(e) { 
      // Error fetching analytics
    }
  }

  // Make sure analytics data is fetched when user navigates to the Analytics tab
  useEffect(() => {
    if (tab === 'analytics') {
      // fetch current range (guard with try/catch inside the function already)
      fetchAnalyticsData(analyticsDateRange);
    }
  }, [tab, analyticsDateRange]);

  // PWA and Offline Functionality
  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        showNotification('🎉 App installed successfully!', 'success')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const loadCachedData = async () => {
    if (!window.offlineStorage) return

    try {
      const [cachedProducts, cachedCustomers, cachedBills] = await Promise.all([
        window.offlineStorage.getCachedProducts(),
        window.offlineStorage.getCachedCustomers(),
        window.offlineStorage.getCachedBills()
      ])

      // Use cached data if no internet or as fallback
      if (!isOnline || products.length === 0) {
        if (cachedProducts.length > 0) setProducts(cachedProducts)
        if (cachedCustomers.length > 0) setCustomers(cachedCustomers)
        if (cachedBills.length > 0) setInvoices(cachedBills)
      }

      // Cache fresh data when online
      if (isOnline) {
        const freshData = await Promise.all([
          fetch(API('/api/products')).then(r => r.ok ? r.json() : []),
          fetch(API('/api/customers')).then(r => r.ok ? r.json() : []),
          fetch(API('/api/invoices')).then(r => r.ok ? r.json() : [])
        ])

        if (freshData[0].length > 0) {
          setProducts(freshData[0])
          await window.offlineStorage.cacheProducts(freshData[0])
        }
        if (freshData[1].length > 0) {
          setCustomers(freshData[1])
          await window.offlineStorage.cacheCustomers(freshData[1])
        }
        if (freshData[2].length > 0) {
          // For this initialization path we want the invoices available — force.
          if (tab === 'invoices') {
            // If the user is already viewing invoices, still update for a fresh load
            setInvoices(freshData[2])
          } else {
            setInvoices(freshData[2])
          }
          await window.offlineStorage.cacheBills(freshData[2])
        }
      }
    } catch (error) {
      // Error loading cached data
    }
  }

  const loadOfflineTransactions = async () => {
    if (!window.offlineStorage) return

    try {
      const transactions = await window.offlineStorage.getOfflineTransactions()
      setOfflineTransactions(transactions)
    } catch (error) {
      // Error loading offline transactions
    }
  }

  const syncOfflineData = async () => {
    if (!isOnline || !window.offlineStorage) return

    // Only attempt to sync if there are offline transactions to avoid
    // showing spurious 'sync failed' notifications on initial load.
    let transactions = []
    try {
      transactions = await window.offlineStorage.getOfflineTransactions()
    } catch (err) {
      // Error checking offline transactions
      return
    }

    if (!transactions || transactions.length === 0) return

    setIsSyncing(true)
    try {
      
      for (const transaction of transactions) {
        try {
          const token = localStorage.getItem('authToken')
          const response = await fetch(API('/api/bills'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transaction.data)
          })

          if (response.ok) {
            await window.offlineStorage.removeOfflineTransaction(transaction.id)
          }
        } catch (error) {
          await window.offlineStorage.updateOfflineTransactionStatus(transaction.id, 'failed')
        }
      }

      // Refresh data after sync
      await Promise.all([fetchProducts(), fetchCustomers(), fetchInvoices(true), fetchStats()])
      await loadOfflineTransactions()
      
      showNotification('✅ Offline data synced successfully!', 'success')
    } catch (error) {
      // Only show the failure notification when there were actually
      // pending offline transactions (we already checked for length > 0)
      showNotification('❌ Failed to sync offline data', 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Authentication checker - requires auth for any modification action
  async function requireAuth(action) {
    if (isAuthenticated) {
      // Check if user account is still valid
      const isValid = await checkUserValidity()
      if (isValid) {
        action() // Already authenticated and valid, execute immediately
      }
    } else {
      setPendingAction(() => action) // Store the action
      // Open the central login page instead of modal
      setShowLoginPage(true)
    }
  }

  // Handle authentication (permanent session until logout)
  async function handleAuth(e) {
    // `Login.jsx` calls this handler without forwarding the event object.
    // Accept an optional event and only preventDefault if an event was passed.
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    
    // Admin username: attempt server login first (if online), then fallback to client ADMIN_PASSWORD
    if (String(authUsername).toLowerCase() === 'admin') {
      let loggedIn = false

      // Try server-side auth when online
      if (isOnline) {
        try {
          const res = await fetch(API('/api/users/login'), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: authUsername, password: authPassword })
          })

          const data = await res.json()

          if (res.ok && data.user) {
            if (!data.user.approved) {
              setAuthError('Your account is pending admin approval.')
              setAuthUsername('')
              setAuthPassword('')
              return
            }

            // Server-authenticated admin
            const adminUser = data.user
            localStorage.setItem('currentUser', JSON.stringify(adminUser))
            localStorage.setItem('isAdmin', 'true')
            localStorage.setItem('userRole', adminUser.role || 'admin')

            setIsAuthenticated(true)
            setIsAdmin(true)
            setUserRole(adminUser.role || 'admin')
            setCurrentUser(adminUser)
            setShowAuthModal(false)
            setAuthError('')
            setAuthUsername('')
            setAuthPassword('')

            alert(`✅ Admin authenticated successfully!`)
            fetchUsers()

            if (pendingAction) {
              pendingAction()
              setPendingAction(null)
            }

            loggedIn = true
          }
        } catch (err) {
          // server auth failed; we'll fall back to client password below
        }
      }

      // Local fallback if server auth didn't succeed
      if (!loggedIn) {
        if (authPassword === ADMIN_PASSWORD) {
          const adminUser = { username: 'admin', role: 'admin', approved: true }

          localStorage.setItem('currentUser', JSON.stringify(adminUser))
          localStorage.setItem('isAdmin', 'true')
          localStorage.setItem('userRole', 'admin')

          setIsAuthenticated(true)
          setIsAdmin(true)
          setUserRole('admin')
          setCurrentUser(adminUser)
          setShowAuthModal(false)
          setAuthError('')
          setAuthUsername('')
          setAuthPassword('')

          alert(`✅ Admin authenticated (local)`) 
          fetchUsers()

          if (pendingAction) {
            pendingAction()
            setPendingAction(null)
          }
          return
        }

        // Admin password mismatch
        setAuthError('Invalid admin password!')
        setAuthPassword('')
        return
      }
      // if loggedIn true we have already returned
    }

    // Regular user login - server only
    try {
      const res = await fetch(API('/api/users/login'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: authUsername, password: authPassword })
      })

      const data = await res.json()

      if (res.ok && data.user) {
        if (!data.user.approved) {
          setAuthError('Your account is pending admin approval.')
          setAuthUsername('')
          setAuthPassword('')
          return
        }

        // User login successful
        const isAdminUser = data.user.role === 'admin'
        localStorage.setItem('currentUser', JSON.stringify(data.user))
        localStorage.setItem('isAdmin', isAdminUser ? 'true' : 'false')
        localStorage.setItem('userRole', data.user.role || 'cashier')

        setIsAuthenticated(true)
        setIsAdmin(isAdminUser)
        setUserRole(data.user.role || 'cashier')
        setCurrentUser(data.user)
        setShowAuthModal(false)
        setAuthError('')
        setAuthUsername('')
        setAuthPassword('')

        alert(`✅ Welcome ${data.user.username}! You're now logged in.`)

        if (isAdminUser) {
          fetchUsers()
        }

        if (pendingAction) {
          pendingAction()
          setPendingAction(null)
        }
      } else {
        setAuthError(data.error || 'Invalid username or password!')
        setAuthPassword('')
      }
    } catch(e) {
      setAuthError('Login failed. Please try again.')
      setAuthPassword('')
    }
  }
  
  // Logout function
  function handleLogout() {
    setIsAuthenticated(false)
    setIsAdmin(false)
    setCurrentUser(null)
    setUserRole('cashier') // Reset to cashier
    localStorage.removeItem('currentUser')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('userRole')
    alert('You have been logged out.')
  }
  
  // User registration: direct username + password (no email required)

  // Step 3: Complete Registration
  async function handleRegister(e) {
    // `RegisterForm` calls this handler without forwarding the event object.
    // Accept an optional event and only preventDefault if an event was passed.
    if (e && typeof e.preventDefault === 'function') e.preventDefault()

    if (registerUsername.length < 3) {
      setRegisterError('Username must be at least 3 characters.')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(registerUsername)) {
      setRegisterError('Username can only contain letters, numbers, and underscores.')
      return
    }

      if (registerPassword.length < 6) {
      setRegisterError('Password must be at least 6 characters long.')
      return
    }

      // Validate email presence + format (client-side check)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!registerEmail || !emailRegex.test(registerEmail)) {
        setRegisterError('Please enter a valid email address.')
        return
      }

    try {
      const res = await fetch(API('/api/users/register'), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          username: registerUsername, 
          password: registerPassword,
          email: registerEmail
        })
      })

      let data = {};
      try { data = await res.json(); } catch (err) { data = {}; }

      if (res.ok) {
        setShowRegisterModal(false)
        setRegisterUsername('')
        setRegisterPassword('')
        setRegisterEmail('')
        setRegisterError('')
        // Keep toast but also show a modal so the user sees the next step clearly
        showNotification('✅ Registration successful! Please wait for admin approval.', 'success')
        setShowRegisterConfirmation(true)
        setShowLoginPage(true)
      } else {
        if (data.error && data.error.toLowerCase().includes('duplicate')) {
          setRegisterError('This username is already taken. Please choose another.')
        } else if (data.error && data.error.toLowerCase().includes('password')) {
          setRegisterError('Password is too weak. Please choose a stronger password.')
        } else if (data.error) {
          setRegisterError(data.error)
        } else {
          setRegisterError('Registration failed. Please try again.')
        }
      }
    } catch(e) {
      setRegisterError('Network error. Please check your connection and try again.')
    }
  }

  // Registration requires email (no OTP verification)
  
  // Approve user (Admin only)
  async function approveUser(userId) {
    if (!isAdmin) return
    
    try {
      const res = await fetch(API(`/api/users/${userId}/approve`), {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'}
      })
      
      if (res.ok) {
        alert('✅ User approved successfully!')
        fetchUsers()
      } else {
        alert('Failed to approve user.')
      }
    } catch(e) {
      alert('Failed to approve user.')
    }
  }
  
  // Delete user (Admin only)
  async function deleteUser(userId) {
    if (!isAdmin) return
    
    if (!confirm('Are you sure you want to delete this user? They will be immediately logged out.')) return
    
    try {
      const res = await fetch(API(`/api/users/${userId}`), {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert('✅ User deleted successfully! They have been logged out.')
        
        // If the deleted user is the current logged-in user (shouldn't happen, but safety check)
        const storedUser = localStorage.getItem('currentUser')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          if (data.deletedUserId && userData.id === data.deletedUserId) {
            // Force logout if somehow admin deleted themselves
            handleLogout()
          }
        }
        
        fetchUsers()
      } else {
        alert('Failed to delete user.')
      }
    } catch(e) {
      alert('Failed to delete user.')
    }
  }
  
  // Force logout user (Admin only) - removes user session
  function forceLogoutUser(username) {
    if (!isAdmin) return

    if (!confirm(`Force logout user "${username}"? They will need to login again.`)) return

    // Ask for admin password to authorize the invalidation
    const adminPass = prompt('Please enter your admin password to confirm:')
    if (!adminPass) return

    (async () => {
      try {
        const res = await fetch(API(`/api/users/${encodeURIComponent(username)}/invalidate`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminUsername: currentUser?.username || 'admin', adminPassword: adminPass })
        })

        const data = await res.json()
        if (res.ok) {
          alert(`✅ User "${username}" sessions invalidated.`)
          fetchUsers()
        } else {
          alert(data.error || 'Failed to invalidate user session')
        }
      } catch (e) {
        alert('Failed to invalidate user session')
      }
    })()
  }
  
  // Revoke user access (Admin only) - unapprove user
  async function revokeUserAccess(userId, username) {
    if (!isAdmin) return
    
    if (!confirm(`Revoke access for user "${username}"? They will be logged out immediately.`)) return
    
    try {
      const res = await fetch(API(`/api/users/${userId}/unapprove`), {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'}
      })
      
      if (res.ok) {
        alert(`✅ Access revoked for "${username}". They will be logged out on their next action.`)
        fetchUsers()
      } else {
        alert('Failed to revoke access.')
      }
    } catch(e) {
      alert('Failed to revoke access.')
    }
  }

  // Admin password change via web UI has been removed. Use server-side tools or
  // environment variables to manage the admin password securely.

  // Change user role (Admin only)
  async function changeUserRole(userId, newRole, username) {
    if (!isAdmin) return
    
    if (!confirm(`Change role for "${username}" to "${newRole}"?`)) return
    
    try {
      const res = await fetch(API(`/api/users/${userId}/role`), {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ role: newRole })
      })
      
      if (res.ok) {
        alert(`✅ Role updated successfully! "${username}" is now a ${newRole}.`)
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update role.')
      }
    } catch(e) {
      alert('Failed to update role.')
    }
  }

  function cancelAuth() {
    setShowAuthModal(false)
    setAuthError('')
    setAuthPassword('')
    setPendingAction(null)
  }

  // Notification System
  function showNotification(message, type = 'success') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Check for low stock on load
  useEffect(() => {
    if (products.length > 0) {
      const lowStockItems = products.filter(p => p.quantity > 0 && p.quantity < 10)
      const outOfStockItems = products.filter(p => p.quantity === 0)
      
      if (lowStockItems.length > 0 || outOfStockItems.length > 0) {
        setShowStockAlert(true)
      }
    }
  }, [products])

  // Track recent activity
  function addActivity(action, details) {
    const activity = {
      id: Date.now(),
      action,
      details,
      timestamp: new Date(),
      user: isAdmin ? 'Admin' : currentUser?.username
    }
    setRecentActivity(prev => [activity, ...prev.slice(0, 9)])
  }

  // Filter and sort products
  function getFilteredProducts() {
    let filtered = [...products]
    // Apply global search (name, barcode, category)
    if (searchQuery && String(searchQuery).trim() !== '') {
      const q = String(searchQuery).trim().toLowerCase();
      filtered = filtered.filter(p => {
        return (
          (p.name || '').toLowerCase().includes(q) ||
          (p.barcode || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
        )
      })
    }
    
    // Apply filter
    switch(productFilter) {
      case 'low-stock':
        filtered = filtered.filter(p => p.quantity > 0 && p.quantity < 10)
        break
      case 'out-of-stock':
        filtered = filtered.filter(p => p.quantity === 0)
        break
      case 'high-profit':
        filtered = filtered.filter(p => p.profitPercent >= 30)
        break
      default:
        break
    }
    
    // Apply sort
    switch(sortBy) {
      case 'stock':
        filtered.sort((a, b) => a.quantity - b.quantity)
        break
      case 'price':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'profit':
        filtered.sort((a, b) => b.profit - a.profit)
        break
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    
    return filtered
  }

  // Filter invoices by date range
  function getFilteredInvoices() {
    if (invoiceDateFilter === 'all') return invoices;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return invoices.filter(inv => {
      const invDate = new Date(inv.created_at);
      
      switch(invoiceDateFilter) {
        case 'today':
          return invDate >= today;
        
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return invDate >= weekAgo;
        
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return invDate >= monthAgo;
        
        case 'custom':
          if (!customStartDate && !customEndDate) return true;
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(customEndDate) : new Date();
          end.setHours(23, 59, 59, 999); // Include the entire end date
          return invDate >= start && invDate <= end;
        
        default:
          return true;
      }
    });
  }

  // Quick add to cart with animation
  function quickAddToCart(product, quantity = 1) {
    for (let i = 0; i < quantity; i++) {
      addToCart(product)
    }
    showNotification(`Added ${quantity}x ${product.name} to cart!`, 'success')
  }


  // Products PDF export removed — we keep CSV/other report telemetry instead

  function exportTransactionsToPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addPDFHeader(doc, 'Transactions Report');
    
    const tableData = getFilteredInvoices().map(inv => [
      `#${inv.id}`,
      inv.customer_name || 'Walk-in',
      formatCurrency0(inv.total || 0),
      inv.paymentMode || 'Cash',
      new Date(inv.created_at).toLocaleDateString()
    ]);
    
    doc.autoTable({
      startY: 30,
      head: [['Invoice #', 'Customer', 'Amount', 'Payment', 'Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: {cellWidth: 30}, 1: {cellWidth: 70}, 2: {cellWidth: 30}, 3: {cellWidth: 30}, 4: {cellWidth: 30} }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 45;
    const total = getFilteredInvoices().reduce((sum, inv) => sum + inv.total, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Revenue: ${formatCurrency0(total)}`, 150, finalY);
    
    doc.save('Transactions-Report.pdf');
    showNotification('✅ Transactions PDF downloaded!', 'success');
  }

  // Shared A4 header for PDFs
  function addPDFHeader(doc, title) {
    try {
      // compute page width dynamically (supports different formats)
      const pageWidth = (doc.internal && doc.internal.pageSize && typeof doc.internal.pageSize.getWidth === 'function') ? doc.internal.pageSize.getWidth() : 210;
      doc.setFillColor(102, 126, 234);
      // draw header band respecting small margin
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(title, pageWidth / 2, 12, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
      doc.setTextColor(0);
    } catch (e) {
      // ignore header problems
    }
  }

  // Backup and Restore Functions
  function downloadBackup() {
    const backupData = {
      timestamp: new Date().toISOString(),
      products: products,
      customers: customers,
      invoices: invoices,
      expenses: expenses,
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Backup downloaded successfully!', 'success');
    trackEvent('backup_downloaded', 'data_management');
  }

  async function restoreBackup(file) {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (!backupData.version || !backupData.timestamp) {
        showNotification('❌ Invalid backup file format', 'error');
        return;
      }
      
      if (window.confirm('This will restore all data from the backup. Continue?')) {
        if (backupData.products) setProducts(backupData.products);
        if (backupData.customers) setCustomers(backupData.customers);
        if (backupData.expenses) setExpenses(backupData.expenses);
        
        showNotification('✅ Backup restored successfully!', 'success');
        trackEvent('backup_restored', 'data_management');
      }
    } catch (error) {
      showNotification('❌ Failed to restore backup: ' + error.message, 'error');
    }
  }

  // Expense Management Functions
  async function fetchExpenses() {
    try {
      const res = await fetch(API('/api/expenses'));
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      // Error fetching expenses
    }
  }

  async function addExpense() {
    if (!expenseCategory || !expenseAmount || !expenseDescription) {
      showNotification('❌ Please fill all expense fields', 'error');
      return;
    }

    try {
      const expenseData = {
        category: expenseCategory,
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        date: expenseDate,
        userId: currentUser?.id || null
      };

      const res = await fetch(API('/api/expenses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      if (res.ok) {
        showNotification('✅ Expense added successfully!', 'success');
        setExpenseCategory('');
        setExpenseAmount('');
        setExpenseDescription('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setShowAddExpense(false);
        fetchExpenses();
        addActivity('Expense Added', `${formatCurrency0(expenseAmount)} - ${expenseCategory}`);
      } else {
        showNotification('❌ Failed to add expense', 'error');
      }
    } catch (error) {
      showNotification('❌ Error adding expense', 'error');
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return;

    try {
      const res = await fetch(API(`/api/expenses/${id}`), {
        method: 'DELETE'
      });

      if (res.ok) {
        showNotification('✅ Expense deleted', 'success');
        fetchExpenses();
      } else {
        showNotification('❌ Failed to delete expense', 'error');
      }
    } catch (error) {
      showNotification('❌ Error deleting expense', 'error');
    }
  }

  // Bulk stock update
  async function bulkUpdateStock(updates) {
    try {
      for (const update of updates) {
        await updateStock(update.id, update.quantity)
      }
      showNotification('Bulk stock update successful!', 'success')
      fetchProducts()
    } catch(e) {
      showNotification('Bulk update failed', 'error')
    }
  }

  // Download Reports Functions - All in PDF Format
  function downloadSalesReport() {
    if (!invoices || invoices.length === 0) { showNotification('No invoices to export', 'warning'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addPDFHeader(doc, 'Sales Report');
    doc.text(`Total Transactions: ${invoices.length}`, 105, 35, { align: 'center' });
    
    // Table data
    const tableData = invoices.map(inv => [
      `#${inv.billNumber || inv.id}`,
      new Date(inv.created_at || inv.date).toLocaleDateString(),
      inv.customer_name || inv.customerName || 'Walk-in',
      (inv.items?.length || 0).toString(),
      formatCurrency0(inv.total || inv.grandTotal || 0),
      inv.paymentMode || 'Cash',
      `₹${(inv.totalProfit || 0).toFixed(1)}`
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [['Invoice #', 'Date', 'Customer', 'Items', 'Total', 'Payment', 'Profit']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 }
    });
    
    // Summary
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 45;
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || inv.grandTotal || 0), 0);
    const totalProfit = invoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Revenue: ${formatCurrency0(totalRevenue)}`, 20, finalY);
    doc.text(`Total Profit: ${formatCurrency0(totalProfit)}`, 20, finalY + 8);
    
    doc.save(`Sales-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('✅ Sales Report PDF downloaded!', 'success');
  }

  function downloadInventoryReport() {
    if (!products || products.length === 0) { showNotification('No products to export', 'warning'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addPDFHeader(doc, 'Inventory Report');
    doc.text(`Total Products: ${products.length}`, 105, 35, { align: 'center' });
    
    // Table data
    const tableData = products.map((prod, index) => [
      (index + 1).toString(),
      prod.name,
      prod.quantity.toString(),
      `₹${prod.price.toFixed(1)}`,
      `₹${(prod.costPrice || 0).toFixed(1)}`,
      `₹${(prod.price - (prod.costPrice || 0)).toFixed(1)}`,
      prod.hsnCode || 'N/A',
      prod.quantity === 0 ? 'Out of Stock' : prod.quantity < 10 ? 'Low Stock' : 'In Stock'
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [['#', 'Name', 'Stock', 'Price', 'Cost', 'Profit/Unit', 'HSN', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113] },
      styles: { fontSize: 7 }
    });
    
    // Summary
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 45;
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity < 10).length;
    const outOfStock = products.filter(p => p.quantity === 0).length;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Low Stock Items: ${lowStock}`, 20, finalY);
    doc.text(`Out of Stock Items: ${outOfStock}`, 20, finalY + 7);
    
    doc.save(`Inventory-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('✅ Inventory Report PDF downloaded!', 'success');
  }

  function downloadCustomerReport() {
    if (!customers || customers.length === 0) { showNotification('No customers to export', 'warning'); return; }
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addPDFHeader(doc, 'Customer Report');
    doc.text(`Total Customers: ${customers.length}`, 105, 35, { align: 'center' });
    
    // Table data
    const tableData = customers.map((cust, index) => [
      (index + 1).toString(),
      cust.name,
      cust.phone,
      cust.address || 'N/A',
      cust.gstin || 'N/A'
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [['#', 'Name', 'Phone', 'Address', 'GSTIN']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182] },
      styles: { fontSize: 9 }
    });
    
    doc.save(`Customer-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('✅ Customer Report PDF downloaded!', 'success');
  }

  // Generic CSV helper
  function downloadCSV(dataRows, filename) {
    try {
      // Escape and format CSV (handle commas and quotes)
      const csvRows = dataRows.map(row => row.map(cell => {
        if (cell == null) return '';
        const text = String(cell);
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
      }).join(','));

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showNotification(`✅ ${filename} CSV downloaded`, 'success');
    } catch (e) {
      showNotification('❌ Failed to export CSV', 'error');
    }
  }

  function downloadSalesCSV() {
    if (!invoices || invoices.length === 0) { showNotification('No invoices to export', 'warning'); return; }
    const headers = ['Invoice #','Date','Customer','Items','Total','Payment Mode','Profit','Tax'];
    const rows = invoices.map(inv => [
      inv.billNumber || inv.id || '',
      new Date(inv.created_at || inv.date || Date.now()).toLocaleString(),
      inv.customer_name || inv.customerName || 'Walk-in',
      inv.items?.length || 0,
      fmt0(inv.total || inv.grandTotal || 0),
      inv.paymentMode || 'Cash',
      fmt0(inv.totalProfit || 0),
      fmt0(inv.taxAmount || 0)
    ]);
    downloadCSV([headers, ...rows], 'Sales_Report');
  }

  function downloadInventoryCSV() {
    if (!products || products.length === 0) { showNotification('No products to export', 'warning'); return; }
    const headers = ['#','Name','Stock','Price','Cost','Profit/Unit','HSN','Status'];
    const rows = products.map((prod, idx) => [
      idx + 1,
      prod.name,
      prod.quantity || 0,
      (prod.price || 0).toFixed(2),
      (prod.costPrice || 0).toFixed(2),
      ((prod.price || 0) - (prod.costPrice || 0)).toFixed(2),
      prod.hsnCode || '',
      prod.quantity === 0 ? 'Out of Stock' : prod.quantity < 10 ? 'Low Stock' : 'In Stock'
    ]);
    downloadCSV([headers, ...rows], 'Inventory_Report');
  }

  function downloadCustomerCSV() {
    if (!customers || customers.length === 0) { showNotification('No customers to export', 'warning'); return; }
    const headers = ['#','Name','Phone','Address','GSTIN'];
    const rows = customers.map((c, idx) => [
      idx + 1, c.name, c.phone || '', c.address || '', c.gstin || ''
    ]);
    downloadCSV([headers, ...rows], 'Customers_Report');
  }

  // Profit Analysis feature removed — exports replaced by CSV. If needed, re-add via secure server report pipeline.

  function addToCart(p){
    if (!p || !p.id) {
      showNotification('Error: Invalid product', 'error');
      return;
    }
    
    // Ensure product has valid ID for database operations
    const productId = p._id || p.id;
    if (!productId) {
      showNotification('Error: Product missing ID', 'error');
      return;
    }
    
    // Check if product is in stock
    if (p.quantity <= 0) {
      showNotification(`❌ ${p.name} is out of stock!`, 'error');
      return;
    }
    
    setCart(c=>{
      const existing = c.find(x=>String(x.productId)===String(productId))
      if (existing) {
        // Check if we have enough stock
        if (existing.quantity + 1 > p.quantity) {
          showNotification(`❌ Only ${p.quantity} units available for ${p.name}`, 'error');
          return c;
        }
        return c.map(x=> String(x.productId)===String(productId) ? {...x, quantity: x.quantity+1} : x)
      }
      return [...c, {
        productId: productId, 
        name: p.name, 
        price: p.price, 
        costPrice: p.costPrice || 0,
        quantity: 1
      }]
    })
    
    // Show success feedback
    showNotification(`✓ ${p.name} added to cart`, 'success');
  }

  function increaseCartQty(productId){
    // Check stock first
    try {
      const pId = String(productId)
      const productObj = products.find(p => String(p._id || p.id) === pId)
      if (productObj && typeof productObj.quantity === 'number') {
        if (productObj.quantity <= 0) {
          showNotification(`❌ ${productObj.name} is out of stock`, 'error')
          return
        }
        setCart(c => c.map(x => {
          if (String(x.productId) === pId) {
            const newQty = (x.quantity || 0) + 1
            if (newQty > productObj.quantity) {
              showNotification(`❌ Only ${productObj.quantity} units available for ${productObj.name}`, 'error')
              return x
            }
            return {...x, quantity: newQty }
          }
          return x
        }))
      } else {
        // fallback if product not found
        setCart(c=> c.map(x=> String(x.productId)===pId ? {...x, quantity: x.quantity+1} : x))
      }
    } catch(e) { }
  }

  function decreaseCartQty(productId){
    setCart(c=> c.map(x=> String(x.productId)===String(productId) ? {...x, quantity: Math.max(1, x.quantity-1)} : x))
  }

  function removeFromCart(productId){
    setCart(c=> c.filter(x=> String(x.productId) !== String(productId)))
  }

  function setCartQty(productId, newQty){
    if (typeof newQty !== 'number') newQty = parseInt(newQty || '0') || 0
    if (newQty < 1) newQty = 1
    // try to respect stock limits
    const productObj = products.find(p => String(p._id || p.id) === String(productId))
    if (productObj && typeof productObj.quantity === 'number' && newQty > productObj.quantity) {
      showNotification(`Only ${productObj.quantity} units available for ${productObj.name}`, 'error')
      newQty = productObj.quantity
    }
    setCart(c => c.map(x => String(x.productId) === String(productId) ? {...x, quantity: newQty} : x))
  }

  async function checkout(){
    try {
      setCheckoutLoading(true);
      
      // Validate cart is not empty
      if (!cart || cart.length === 0) {
        showNotification('❌ Cart is empty. Add products before checkout.', 'error');
        setCheckoutLoading(false);
        return;
      }

      // Validate all cart items have required data
      const invalidItems = cart.filter(item => !item.productId || !item.price || !item.quantity);
      if (invalidItems.length > 0) {
        showNotification('❌ Some cart items are invalid. Please remove and re-add them.', 'error');
        setCheckoutLoading(false);
        return;
      }

      const subtotal = cart.reduce((s,it)=> s + it.price*it.quantity, 0);
      const discountAmount = subtotal * discount / 100;
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * DEFAULT_GST; // Always 18%
      const grandTotal = afterDiscount + taxAmount;
      
      // Validate split payment if enabled
      if (splitPayment) {
        const validation = validateSplitPayment(cashAmount, upiAmount, cardAmount, grandTotal);
        if (!validation.valid) {
          showNotification(`❌ ${validation.error}`, 'error');
          setCheckoutLoading(false);
          return;
        }
      }
      
      const payload = { 
        customerId: selectedCustomer?.id || null, 
        total: grandTotal,
        totalAmount: grandTotal,
        subtotal: subtotal,
        discountAmount: discountAmount,
        discountValue: discount,
        taxRate: GST_PERCENT,
        taxAmount: taxAmount,
        items: cart,
        discountPercent: discount,
        customerState: 'Same',
        paymentMode: splitPayment ? PAYMENT_MODES.SPLIT : paymentMode,
        cashAmount: splitPayment ? (parseFloat(cashAmount) || 0) : 0,
        upiAmount: splitPayment ? (parseFloat(upiAmount) || 0) : 0,
        cardAmount: splitPayment ? (parseFloat(cardAmount) || 0) : 0,
        userId: currentUser?.id || null,
        username: selectedSeller || (isAdmin ? 'admin' : currentUser?.username || 'Unknown')
      }
      // Loyalty removed: do not add referral/applyLoyalty flags

      // Handle online checkout
      if (isOnline) {
        const res = await fetch(API('/api/checkout'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const j = await res.json()
        if (j.billId) { 
          // Store bill data and show bill modal
          setLastBill({
            ...j,
            billId: j.billId,
            billNumber: j.billNumber || j.billId,
            customerName: selectedCustomer?.name || 'Walk-in Customer',
            customerPhone: selectedCustomer?.phone || '',
            customerAddress: selectedCustomer?.address || '',
            paymentMode: splitPayment ? PAYMENT_MODES.SPLIT : paymentMode,
            splitPaymentDetails: splitPayment ? {
              cashAmount: parseFloat(cashAmount) || 0,
              upiAmount: parseFloat(upiAmount) || 0,
              cardAmount: parseFloat(cardAmount) || 0,
              totalAmount: grandTotal
            } : null,
            subtotal: subtotal,
            discountAmount: discountAmount,
            discountPercent: discount,
            discountValue: discount,
            taxRate: taxRate || GST_PERCENT,
            taxAmount: taxAmount,
            total: grandTotal,
            items: cart.map(item => ({
              productId: item.productId,
              name: item.name,
              productName: item.name,
              quantity: item.quantity,
              price: item.price,
              unitPrice: item.price
            })),
            date: new Date().toISOString(),
            createdByUsername: selectedSeller || (isAdmin ? 'admin' : currentUser?.username || 'Unknown')
          ,
            // Loyalty removed: server no longer returns loyalty metadata
          });
          setShowBill(true);
          
          // Track successful sale
          trackEvent('sale_completed', 'transaction', `Bill-${j.billId}`, grandTotal);
          trackEvent('payment_method', 'transaction', paymentMode);
          
          // Show success notification
          showNotification(`✓ Sale completed! Bill #${j.billId}`, 'success');
          
          // Track activity
          addActivity('Sale Completed', `Bill #${j.billId} - ₹${fmt0(grandTotal)}`);
          
          // Clear cart and reset form
          setCart([]); 
          setSelectedCustomer(null);
          setDiscount(0);
          setPaymentMode(PAYMENT_MODES.CASH);
          setSearchQuery('');
          setSplitPayment(false);
          setCashAmount('');
          setUpiAmount('');
          setCardAmount('');
          
          // Refresh data
          fetchProducts(); 
          fetchInvoices(true); 
          fetchStats();
        } else if (j.error) {
          trackEvent('sale_failed', 'transaction', j.error);
          showNotification('Checkout failed: ' + j.error, 'error');
        }
      } else {
        // Handle offline checkout
        if (window.offlineStorage) {
          const offlineId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const token = localStorage.getItem('authToken');
          
          // Save transaction for later sync
          await window.offlineStorage.saveOfflineTransaction(payload, token);
          
          // Create temporary bill data for display
          const offlineBill = {
            billId: offlineId,
            billNumber: offlineId,
            customerName: selectedCustomer?.name || 'Walk-in Customer',
            customerPhone: selectedCustomer?.phone || '',
            customerAddress: selectedCustomer?.address || '',
            paymentMode: splitPayment ? PAYMENT_MODES.SPLIT : paymentMode,
            splitPaymentDetails: splitPayment ? {
              cashAmount: parseFloat(cashAmount) || 0,
              upiAmount: parseFloat(upiAmount) || 0,
              cardAmount: parseFloat(cardAmount) || 0,
              totalAmount: grandTotal
            } : null,
            subtotal: subtotal,
            discountAmount: discountAmount,
            discountPercent: discount,
            discountValue: discount,
            taxRate: taxRate || GST_PERCENT,
            taxAmount: taxAmount,
            total: grandTotal,
            items: cart.map(item => ({
              productId: item.productId,
              name: item.name,
              productName: item.name,
              quantity: item.quantity,
              price: item.price,
              unitPrice: item.price
            })),
            date: new Date().toISOString(),
            createdByUsername: selectedSeller || (isAdmin ? 'admin' : currentUser?.username || 'Unknown'),
            isOffline: true
          };
          
          // Store bill data and show bill modal
          setLastBill(offlineBill);
          setShowBill(true);
          
          // Show offline notification
          showNotification(`📴 Sale saved offline! Will sync when connected.`, 'warning');
          
          // Track activity
          addActivity('Sale Completed (Offline)', `Bill #${offlineId} - ₹${fmt0(grandTotal)}`);
          
          // Clear cart and reset form
          setCart([]); 
          setSelectedCustomer(null);
          setDiscount(0);
          setPaymentMode('Cash');
          setSearchQuery('');
          setSplitPayment(false);
          setCashAmount('');
          setUpiAmount('');
          setCardAmount('');
          
          // Update offline transactions list
          await loadOfflineTransactions();
        } else {
          showNotification('❌ Cannot process sale offline. Please check your connection.', 'error');
        }
      }
      
      setCheckoutLoading(false);
    } catch(e) {
      setCheckoutLoading(false);
      if (isOnline) {
        showNotification('Checkout failed. Please try again.', 'error');
      } else {
        showNotification('❌ Offline checkout failed. Please try again.', 'error');
      }
    }
  }
  
  function printBill() {
    if (!lastBill) return;

    const printWindow = window.open('', '_blank');

    // Use stored bill totals when available, otherwise compute from items
    const subtotal = typeof lastBill.subtotal === 'number'
      ? lastBill.subtotal
      : lastBill.items.reduce((s, it) => s + (it.price * it.quantity), 0);

    // discountPercent may be stored as discountPercent or discountValue; fall back to current discount state
    const discountPercent = typeof lastBill.discountPercent === 'number'
      ? lastBill.discountPercent
      : (typeof lastBill.discountValue === 'number' ? lastBill.discountValue : discount);

    const discountAmount = typeof lastBill.discountAmount === 'number'
      ? lastBill.discountAmount
      : (subtotal * (discountPercent / 100));

    const afterDiscount = typeof lastBill.afterDiscount === 'number'
      ? lastBill.afterDiscount
      : (subtotal - discountAmount);

    const taxAmount = typeof lastBill.gstAmount === 'number'
      ? lastBill.gstAmount
      : (afterDiscount * ((lastBill.taxRate || taxRate) / 100));

    const grandTotal = typeof lastBill.grandTotal === 'number'
      ? lastBill.grandTotal
      : (afterDiscount + taxAmount);

    const billHTML = `
      <html>
        <head>
          <title>Invoice #${lastBill.billId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 20mm; 
              background: #fff;
              color: #000;
              font-size: 11pt;
            }
            .invoice-box { 
              max-width: 800px; 
              margin: auto; 
              border: 1px solid #000;
              padding: 20px;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px double var(--border);
              padding-bottom: 15px;
              margin-bottom: 15px;
            }
            .logo { font-size: 48px; margin-bottom: 5px; }
            .company-name { font-size: 24px; font-weight: bold; margin: 5px 0; }
            .company-details { font-size: 10pt; line-height: 1.4; color: #333; }
            .invoice-title { 
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              background: #0b5cff;
              color: #fff;
              padding: 8px;
              margin: 15px 0;
              letter-spacing: 2px;
            }
            .section { 
              display: flex; 
              justify-content: space-between; 
              margin: 15px 0;
              padding: 10px 0;
            }
            .info-block { flex: 1; }
            .info-block h3 { 
              font-size: 11pt; 
              margin-bottom: 8px; 
              border-bottom: 2px solid #000;
              padding-bottom: 3px;
            }
            .info-block p { 
              margin: 4px 0; 
              font-size: 10pt;
              line-height: 1.5;
            }
            .label { font-weight: bold; display: inline-block; min-width: 80px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 15px 0;
              border: 1px solid #000;
            }
            th { 
              background: #000; 
              color: #fff; 
              padding: 10px 8px; 
              text-align: left;
              font-size: 10pt;
              border: 1px solid #000;
            }
            td { 
              padding: 8px; 
              border: 1px solid #000;
              font-size: 10pt;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-section { 
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #000;
            }
            .totals-table {
              margin-left: auto;
              width: 300px;
              border: none;
            }
            .totals-table td {
              border: none;
              padding: 5px 10px;
              border-bottom: 1px dotted #ccc;
            }
            .totals-table .grand-total {
              font-size: 14pt;
              font-weight: bold;
              border-top: 3px double #000;
              border-bottom: 3px double #000;
              background: #f0f0f0;
            }
            .amount-words {
              margin: 15px 0;
              padding: 10px;
              background: #f9f9f9;
              border: 1px dashed #000;
              font-style: italic;
              font-size: 10pt;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px dashed #000;
              text-align: center;
              font-size: 10pt;
            }
            .terms {
              margin: 20px 0;
              font-size: 9pt;
              line-height: 1.5;
              padding: 10px;
              background: #f9f9f9;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
            }
            .signature-box {
              text-align: center;
              padding-top: 40px;
              border-top: 1px solid #000;
              width: 200px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
              .invoice-box { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- Header -->
            <div class="header">
              <div class="logo">${companyInfo.logo}</div>
              <div class="company-name">${companyInfo.name}</div>
              <div class="company-details">
                ${companyInfo.address}<br>
                Phone: ${companyInfo.phone} | Email: ${companyInfo.email}<br>
                GSTIN: ${companyInfo.gstin}
              </div>
            </div>
            
            <!-- Invoice Title -->
            <div class="invoice-title">TAX INVOICE</div>
            
            <!-- Invoice & Customer Info -->
            <div class="section">
              <div class="info-block">
                <h3>Bill To:</h3>
                ${selectedCustomer ? `
                  <p><span class="label">Name:</span> ${selectedCustomer.name}</p>
                  <p><span class="label">Phone:</span> ${selectedCustomer.phone || 'N/A'}</p>
                  <p><span class="label">Address:</span> ${selectedCustomer.address || 'N/A'}</p>
                  ${selectedCustomer.gstin ? `<p><span class="label">GSTIN:</span> ${selectedCustomer.gstin}</p>` : ''}
                ` : `
                  <p><span class="label">Customer:</span> Walk-in Customer</p>
                `}
              </div>
              <div class="info-block" style="text-align: right;">
                <h3>Invoice Details:</h3>
                <p><span class="label">Invoice #:</span> ${lastBill.billId}</p>
                <p><span class="label">Date:</span> ${new Date(lastBill.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                <p><span class="label">Time:</span> ${new Date(lastBill.date).toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'})}</p>
                <p><span class="label">Payment:</span> ${paymentMode}</p>
              </div>
            </div>
            
            <!-- Items Table -->
            <table>
              <thead>
                <tr>
                  <th class="text-center">S.No</th>
                  <th>Product Name</th>
                  <th>HSN Code</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lastBill.items.map((item, idx) => {
                  const product = products.find(p => (p._id || p.id) === (item.productId || item.productId?.toString()));
                  const name = (item.productName || item.name || product?.name || 'Item').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
                  const hsn = (product?.hsnCode || item.hsnCode || 'N/A');
                  const qty = Number(item.quantity || item.qty || 0);
                  const rate = Number(item.unitPrice || item.price || item.rate || 0);
                  const amount = (rate * qty) || 0;
                  return `
                    <tr>
                      <td class="text-center">${idx + 1}</td>
                      <td>${name}</td>
                      <td>${hsn}</td>
                      <td class="text-center">${qty}</td>
                      <td class="text-right">₹${rate.toFixed(2)}</td>
                      <td class="text-right">₹${amount.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-section">
              <table class="totals-table">
                <tr>
                  <td>Subtotal:</td>
                      <td class="text-right">${formatCurrency0(subtotal)}</td>
                </tr>
                ${discountAmount > 0 ? `
                  <tr>
                    <td>Discount (${discountPercent}%):</td>
                    <td class="text-right">- ${formatCurrency0(discountAmount)}</td>
                  </tr>
                  <tr>
                    <td>After Discount:</td>
                    <td class="text-right">${formatCurrency0(afterDiscount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td>GST (${taxRate}%):</td>
                  <td class="text-right">${formatCurrency0(taxAmount)}</td>
                </tr>
                <tr class="grand-total">
                  <td><strong>GRAND TOTAL:</strong></td>
                  <td class="text-right"><strong>${formatCurrency0(grandTotal)}</strong></td>
                </tr>
              </table>
            </div>
            
            <!-- Amount in Words -->
            <div class="amount-words">
              <strong>Amount in Words:</strong> ${numberToWords(Math.round(grandTotal))} Rupees Only
            </div>
            
            <!-- Terms & Conditions -->
            <div class="terms">
              <strong>Terms & Conditions:</strong><br>
              1. Goods once sold cannot be returned or exchanged.<br>
              2. Payment is due at the time of purchase.<br>
              3. Subject to local jurisdiction only.<br>
              4. E. & O.E. (Errors and Omissions Excepted)
            </div>
            
            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">Customer Signature</div>
              <div class="signature-box">Authorized Signatory</div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <strong>Thank you for your business!</strong><br>
              This is a computer-generated invoice.
            </div>
          </div>
          
          <!-- Print Button -->
          <div class="no-print" style="text-align: center; margin: 20px;">
            <button onclick="window.print()" style="padding: 12px 30px; font-size: 14px; background: #111; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
              🖨️ Print Invoice
            </button>
            <button onclick="window.close()" style="padding: 12px 30px; font-size: 14px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
              ✖️ Close
            </button>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(billHTML);
    printWindow.document.close();
  }
  function formatPhoneForWhatsApp(phone) {
    if (!phone) return null;
    let digits = ('' + phone).replace(/\D/g, '');
    // If 10 digits assume local (prepend country code from companyInfo or default to 91)
    if (digits.length === 10) {
      const m = (companyInfo.phone || '').match(/\+?(\d{1,3})/);
      digits = (m ? m[1] : '91') + digits;
    }
    if (digits.length < 8 || digits.length > 15) return null;
    return digits;
  }

  async function ensurePublicInvoiceUrl(invoice) {
    if (!invoice) return null;
    if (invoice.publicUrl) return invoice.publicUrl;
    try {
      const id = invoice.id || invoice.billId || invoice.billNumber;
      const res = await fetch(API(`/api/invoices/${id}/public`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: currentUser?.username || 'system', company: companyInfo })
      });
      if (!res.ok) return null;
      const j = await res.json();
      return j.publicUrl || null;
    } catch (e) {
      return null;
    }
  }

  async function buildInvoiceWhatsAppMessage(invoice) {
    const publicUrl = await ensurePublicInvoiceUrl(invoice);
    const customer = invoice.customer_name || invoice.customerName || (invoice.customer && invoice.customer.name) || 'Customer';
    const id = invoice.id || invoice.billNumber || invoice.billId || '';
    const total = (invoice.total || invoice.grandTotal || invoice.totalAmount || 0);
    const due = invoice.dueDate || '';
    const itemsSummary = (invoice.items || []).slice(0,5).map(it => `${it.quantity}× ${it.name || it.productName || ''}`).join(', ');
    const url = publicUrl || `${window.location.origin}/invoices/${id}`;
    let msg = `Hello ${customer},\nHere is your invoice #${id} for ${formatCurrency0(total)}.\n`;
    if (itemsSummary) msg += `Items: ${itemsSummary}\n`;
    if (due) msg += `Due: ${due}\n`;
    msg += `View invoice: ${url}\n`;

    // Loyalty messages removed

    msg += `\n\nThank you!\n${companyInfo.name}`;
    // Include salesperson name for reference
    const salespersonName = selectedSeller || currentUser?.name || currentUser?.username || 'Salesperson';
    if (salespersonName) msg += `\nSalesperson: ${salespersonName}`;
    return encodeURIComponent(msg);
  }

  async function sendInvoiceWhatsApp(invoice) {
    const phone = invoice.customerPhone || invoice.customer_phone || (invoice.customer && (invoice.customer.phone || invoice.customerPhone)) || '';
    const cleaned = formatPhoneForWhatsApp(phone);
    if (!cleaned) {
      showNotification('❌ Customer phone missing or invalid', 'error');
      return;
    }

    const text = await buildInvoiceWhatsAppMessage(invoice);
    const url = `https://wa.me/${cleaned}?text=${text}`;
    window.open(url, '_blank');

    // Best-effort audit log (non-blocking)
    try {
      fetch(API('/api/audit-logs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whatsapp_invoice_opened',
          username: currentUser?.username || 'unknown',
          invoiceId: invoice.id || invoice.billId || invoice.billNumber || null,
          phone: cleaned,
          total: invoice.total || invoice.grandTotal || null,
          timestamp: new Date().toISOString()
        })
      }).catch(()=>{});
    } catch(e) {}

    addActivity('WhatsApp Invoice Opened', `Invoice ${invoice.id || invoice.billNumber} -> ${cleaned}`);
    showNotification('Opening WhatsApp with invoice message...', 'info');
  }

  // Invoice PDF generation (client-side) removed — UI no longer offers Download or Server PDF functions.
  
  // Convert number to words (Indian system)
  function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    function convertHundreds(n) {
      let str = '';
      if (n > 99) {
        str += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        str += teens[n - 10] + ' ';
        return str.trim();
      }
      str += ones[n] + ' ';
      return str.trim();
    }
    
    if (num >= 10000000) {
      return convertHundreds(Math.floor(num / 10000000)) + ' Crore ' + numberToWords(num % 10000000);
    }
    if (num >= 100000) {
      return convertHundreds(Math.floor(num / 100000)) + ' Lakh ' + numberToWords(num % 100000);
    }
    if (num >= 1000) {
      return convertHundreds(Math.floor(num / 1000)) + ' Thousand ' + numberToWords(num % 1000);
    }
    return convertHundreds(num);
  }

  async function addProduct(){
    try {
      showNotification('🔄 Adding product...', 'info');
      
      // Validate required fields
      if (!newProduct.name || !newProduct.price) {
        showNotification('❌ Product name and price are required.', 'error');
        return;
      }
      
      const res = await fetch(API('/api/products'), { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          ...newProduct,
          userId: currentUser?.id || null,
          username: isAdmin ? 'admin' : currentUser?.username
        })
      })
      
      if (res.ok) { 
        const result = await res.json();
        
        showNotification(`✓ Product "${newProduct.name}" added successfully!`, 'success');
        addActivity('Product Added', newProduct.name);
        setShowAddProduct(false); 
        setNewProduct({name:'', quantity:0, price:0, costPrice:0, hsnCode:'9999', minStock:10}); 
        
        // Refresh data
        await fetchProducts(); 
        await fetchStats();
      } else {
        const err = await res.json()
        showNotification('Failed to add product: ' + (err.error || 'Unknown error'), 'error');
      }
    } catch(e) {
      
      // Check if it's a network error (backend not available)
      if (e.message === 'Failed to fetch' || !navigator.onLine) {
        showNotification('⚠️ Backend server not connected. Please deploy your backend server first. See BACKEND_SETUP.md for instructions.', 'error');
        
        // Optionally save to local storage for later sync
        const localProducts = JSON.parse(localStorage.getItem('pendingProducts') || '[]');
        const pendingProduct = {
          ...newProduct,
          id: Date.now(),
          userId: currentUser?.id || null,
          username: isAdmin ? 'admin' : currentUser?.username,
          createdAt: new Date().toISOString()
        };
        localProducts.push(pendingProduct);
        localStorage.setItem('pendingProducts', JSON.stringify(localProducts));
        
        showNotification(`💾 Product saved locally. Will sync when backend is available. (${localProducts.length} pending)`, 'warning');
      } else {
        showNotification('Failed to add product. Please check your connection and try again.', 'error');
      }
    }
  }


  async function addCustomer(){
    try {
      const res = await fetch(API('/api/customers'), { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          ...newCustomer,
          userId: currentUser?.id || null,
          username: isAdmin ? 'admin' : currentUser?.username
        })
      })
      if (res.ok) { 
        const result = await res.json();
        showNotification(`✓ Customer "${newCustomer.name}" added successfully!`, 'success');
        addActivity('Customer Added', newCustomer.name);
        setShowAddCustomer(false); 
        setNewCustomer({name:'', phone:'', address:'', place:'', pincode:'', state:'Same', gstin:''}); 
        // Refresh customer list and auto-select the newly created customer so
        // users can continue the checkout flow without manually searching.
        await fetchCustomers(); 
        await fetchStats();
        // If API returned the created customer id, select it in the POS.
        if (result && (result.id || result._id)) {
          const id = result.id || result._id;
          const cust = (await (async ()=> { try { const c = await fetch(API('/api/customers')); if (c.ok) return await c.json(); } catch(e){} return customers; })()) || null;
          // Try to find the newly created customer in freshest list and select it
          const newCust = (cust && Array.isArray(cust)) ? cust.find(c => c.id === id || c._id === id) : null;
          if (newCust) setSelectedCustomer(newCust);
        }
      } else {
        const err = await res.json()
        showNotification('Failed to add customer: ' + (err.error || 'Unknown error'), 'error');
      }
    } catch(e) {
      showNotification('Failed to add customer. Please try again.', 'error');
    }
  }

  // Handle place autocomplete for Add Customer modal using free OpenStreetMap Nominatim API
  async function fetchPlaceOptions(query) {
    if (!query || query.trim().length < 2) { setPlaceSuggestions([]); return; }
    try {
      setPlaceLoading(true);
      const q = encodeURIComponent(query + ', India');
      
      // Using free OpenStreetMap Nominatim API for Indian addresses and pincodes
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=8&countrycodes=in`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'InventoryManagementApp/1.0' // Required by Nominatim usage policy
        }
      });
      
      if (!res.ok) { setPlaceSuggestions([]); setPlaceLoading(false); return; }
      
      const data = await res.json();
      
      if (data && data.length > 0) {
        const suggestions = data.map(result => {
          // Extract pincode from address object
          const pincode = result.address?.postcode || '';
          
          // Extract city/locality
          const city = result.address?.city || 
                      result.address?.town || 
                      result.address?.village || 
                      result.address?.state_district || 
                      result.display_name.split(',')[0];
          
          return {
            display_name: result.display_name,
            place: city,
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            postcode: pincode,
            full_address: result.display_name
          };
        });
        
        setPlaceSuggestions(suggestions);
      } else {
        setPlaceSuggestions([]);
      }
    } catch (e) {
      setPlaceSuggestions([]);
    } finally {
      setPlaceLoading(false);
    }
  }

  function handlePlaceChange(value) {
    setNewCustomer({...newCustomer, place: value});
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (!value || value.trim().length < 2) {
      setPlaceSuggestions([]);
      return;
    }
    placeDebounceRef.current = setTimeout(() => fetchPlaceOptions(value.trim()), 400);
  }

  // Handle barcode scan result
  async function handleBarcodeResult(barcode) {
    try {
      if (!barcode || !barcode.trim()) {
        showNotification('❌ Invalid barcode scanned', 'error');
        return;
      }

      showNotification('🔍 Searching for product...', 'info');
      
      // First try API search
      const res = await fetch(API(`/api/products/barcode/${encodeURIComponent(barcode.trim())}`));
      
      if (res.ok) {
        const product = await res.json();
        
        // Ensure product has proper ID structure
        const formattedProduct = {
          ...product,
          id: product.id || product._id,
          _id: product.id || product._id
        };
        
        if (scannerMode === 'pos') {
          // Add to cart in POS
          addToCart(formattedProduct);
          showNotification(`✓ "${product.name}" added to cart!`, 'success');
        } else {
          // Show product details
          setSelectedProduct(formattedProduct);
          setShowProductDetails(true);
          showNotification(`✓ Product "${product.name}" found!`, 'success');
        }
        setShowBarcodeScanner(false);
        setScannedBarcode('');
        return;
      }
      
      // If API search fails, try local search as fallback
      const localProduct = products.find(p => 
        p.barcode === barcode || 
        p.name.toLowerCase().includes(barcode.toLowerCase()) ||
        p.id === barcode ||
        p._id === barcode
      );
      
      if (localProduct) {
        if (scannerMode === 'pos') {
          // Add to cart in POS
          addToCart(localProduct);
          showNotification(`✓ "${localProduct.name}" added to cart!`, 'success');
        } else {
          // Show product details
          setSelectedProduct(localProduct);
          setShowProductDetails(true);
          showNotification(`✓ Product "${localProduct.name}" found!`, 'success');
        }
        setShowBarcodeScanner(false);
        setScannedBarcode('');
      } else {
        showNotification(`❌ No product found with code: ${barcode}`, 'error');
      }
    } catch (e) {
      showNotification(`❌ Search failed. Please try again or use manual entry.`, 'error');
      // Don't close scanner on error, let user try again
    }
  }

  // Initialize barcode scanner with html5-qrcode
  useEffect(() => {
    if (!showBarcodeScanner) return;

    let html5QrCode;
    let timeoutId;
    
    const initScanner = async () => {
      try {
        // Check if element exists
        const scannerElement = document.getElementById("qr-reader");
        if (!scannerElement) {
          return;
        }

        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Try to get camera permissions first
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          
          // Prefer back camera if available
          const backCamera = cameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          );
          
          const cameraId = backCamera ? backCamera.id : cameras[0].id;
          
          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              if (html5QrCode) {
                html5QrCode.stop().then(() => {
                  handleBarcodeResult(decodedText);
                }).catch(err => {});
              }
            },
            (errorMessage) => {
              // Handle scan errors silently (too frequent)
              if (errorMessage.includes('No QR code found')) {
                return; // Ignore "no code found" messages
              }
            }
          );
        } else {
          showNotification('📷 No cameras found. Please use manual entry.', 'warning');
        }
      } catch (err) {
        showNotification('📷 Camera access failed. Please use manual entry or check permissions.', 'warning');
      }
    };
    
    // Delay initialization to ensure DOM is ready
    timeoutId = setTimeout(initScanner, 200);
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (html5QrCode) {
        html5QrCode.stop().catch(e => {});
      }
    };
  }, [showBarcodeScanner]);

  async function updateStock(productId, newQty){
    try {
      const res = await fetch(API(`/api/products/${productId}`), { 
        method:'PATCH', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify({
          quantity: newQty,
          userId: currentUser?.id || null,
          username: isAdmin ? 'admin' : currentUser?.username
        })
      })
      if (res.ok) { 
        fetchProducts(); 
        fetchStats(); 
      } else {
        const err = await res.json()
        alert('Failed to update stock: ' + (err.error || 'Unknown error'))
      }
    } catch(e) {
      alert('Failed to update stock. Please try again.')
    }
  }

  async function deleteProduct(id){
    if (!confirm('Delete this product?')) return
    try {
      const userId = currentUser?.id || null;
      const username = isAdmin ? 'admin' : currentUser?.username;
      const res = await fetch(API(`/api/products/${id}?userId=${userId}&username=${username}`), { method:'DELETE' })
      if (res.ok) { 
        fetchProducts(); 
        fetchStats(); 
      } else {
        const err = await res.json()
        alert('Failed to delete product: ' + (err.error || 'Unknown error'))
      }
    } catch(e) {
      alert('Failed to delete product. Please try again.')
    }
  }

  // Barcode & Photo Management Functions
  async function showProductBarcode(product) {
    setBarcodeProduct(product);
    setShowBarcodeModal(true);
    
    // Fetch barcode and QR code images
    try {
      const barcodeRes = await fetch(API(`/api/products/${product.id}/barcode?format=image`));
      const barcodeData = await barcodeRes.json();
      setBarcodeImage(barcodeData.image);
      
      const qrRes = await fetch(API(`/api/products/${product.id}/barcode?format=qr`));
      const qrData = await qrRes.json();
      setQrCodeImage(qrData.qrCode);
    } catch (e) {
      showNotification('Failed to generate barcode', 'error');
    }
  }

  async function uploadProductPhoto(productId, file) {
    if (!file) return;
    
    setUploadingPhoto(true);
    
    try {
      // First, create a local preview immediately
      const dataUrl = await readFileAsDataURL(file);
      setLocalProductPhotos(lp => ({ ...lp, [productId]: dataUrl }));
      setPhotoPreview(dataUrl);
      
      // Then try to upload to server
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('userId', currentUser?.id || currentUser?._id || '');
      formData.append('username', isAdmin ? 'admin' : currentUser?.username || '');
      
      const res = await fetch(API(`/api/products/${productId}/photo`), {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showNotification('✓ Product photo uploaded successfully!', 'success');
        fetchProducts(); // Refresh product list
        setPhotoPreview(null);
      } else {
        // server rejected; save to pending queue and local cache so UI retains image
        showNotification('Photo saved locally. Will upload when server is available.', 'warning');
        setPendingUploads(p => ([...p, { type: 'product', id: productId, fileData: dataUrl, mime: file.type, fileName: file.name, ts: Date.now() }]));
      }
    } catch (e) {
      // Even on error, keep the local preview
      showNotification('Photo saved locally. Will sync when online.', 'warning');
      try {
        const dataUrl = await readFileAsDataURL(file);
        setLocalProductPhotos(lp => ({ ...lp, [productId]: dataUrl }));
        setPendingUploads(p => ([...p, { type: 'product', id: productId, fileData: dataUrl, mime: file.type, fileName: file.name, ts: Date.now() }]));
      } catch(err) {
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Admin: upload profile photo for a user
  async function uploadUserPhoto(userId, file) {
    if (!file) return
    setUploadingPhoto(true)
    
    try {
      // First create local preview
      const dataUrl = await readFileAsDataURL(file);
      setLocalUserPhotos(u => ({ ...(u||{}), [userId]: dataUrl }));
      
      // Then upload to server
      const stored = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('userId', stored.id || stored._id || '')
      fd.append('username', stored.username || '')

      const res = await fetch(API(`/api/users/${userId}/photo`), { method: 'POST', body: fd })
      const data = await res.json()
      
      if (res.ok) {
        showNotification('✅ User photo uploaded', 'success')
        // update local cache with server URL
        setLocalUserPhotos(u => ({ ...(u||{}), [userId]: API(`/api/users/${userId}/photo`) }))
        fetchUsers()
      } else {
        // Keep local preview even if server fails
        showNotification('Photo saved locally. Will upload when server is available.', 'warning')
        setPendingUploads(p => ([...p, { type: 'user', id: userId, fileData: dataUrl, mime: file.type, fileName: file.name, ts: Date.now() }]))
      }
    } catch (e) {
      showNotification('Photo saved locally. Will sync when online.', 'warning')
      try {
        const dataUrl = await readFileAsDataURL(file)
        setLocalUserPhotos(u => ({ ...u, [userId]: dataUrl }))
        setPendingUploads(p => ([...p, { type: 'user', id: userId, fileData: dataUrl, mime: file.type, fileName: file.name, ts: Date.now() }]))
      } catch(err) { }
    } finally {
      setUploadingPhoto(false)
    }
  }

  // read File -> dataURL helper
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = (e) => reject(e)
        reader.readAsDataURL(file)
      } catch(err) { reject(err) }
    })
  }

  async function deleteUserPhoto(userId) {
    if (!confirm('Delete user photo?')) return
    try {
      const stored = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const res = await fetch(API(`/api/users/${userId}/photo?userId=${encodeURIComponent(stored.id || stored._id || '')}&username=${encodeURIComponent(stored.username || '')}`), { method: 'DELETE' })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      showNotification('✅ User photo deleted', 'success')
      // remove local cache entry for this user
      setLocalUserPhotos(u => { const copy = { ...(u||{}) }; delete copy[userId]; return copy })
      fetchUsers()
    } catch (e) {
      showNotification('Failed to delete user photo', 'error')
    }
  }

  // Upload profile photo to server when user is authenticated and online
  async function uploadProfilePhoto(file) {
    if (!file) return
    setUploadingPhoto(true)
    try {
      const stored = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const userId = stored && (stored.id || stored._id || stored.userId)
      // If user is not authenticated or no id, bail out — fallback to local persist
      if (!isAuthenticated || !isOnline || !userId) {
        // fallback: keep preview locally
        return
      }

      const fd = new FormData()
      fd.append('photo', file)
      // include actor context
      fd.append('userId', stored.id || stored._id || '')
      fd.append('username', stored.username || '')

      const res = await fetch(API(`/api/users/${userId}/photo`), {
        method: 'POST',
        body: fd
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      // server returns a stable endpoint - use full API path resolution
      const serverPath = API(`/api/users/${userId}/photo`)
      setProfilePhoto(serverPath)
      setLocalUserPhotos(u => ({ ...(u||{}), [userId]: serverPath }))
      showNotification('✅ Profile photo saved to server', 'success')
    } catch (e) {
      showNotification('Failed to sync photo to server. Saved locally and will retry when online.', 'warning')
      try {
        const dataUrl = await readFileAsDataURL(file)
        setPendingUploads(p => ([...p, { type: 'profile', id: userId, fileData: dataUrl, mime: file.type, fileName: file.name, ts: Date.now() }]))
      } catch(err) { }
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function deleteProductPhoto(productId) {
    if (!confirm('Delete product photo?')) return;
    
    try {
      const userId = currentUser?.id || null;
      const username = isAdmin ? 'admin' : currentUser?.username;
      const res = await fetch(API(`/api/products/${productId}/photo?userId=${userId}&username=${username}`), {
        method: 'DELETE'
      });
      
      if (res.ok) {
        showNotification('✓ Product photo deleted successfully!', 'success');
        fetchProducts();
      } else {
        const err = await res.json();
        showNotification('Failed to delete photo: ' + (err.error || 'Unknown error'), 'error');
      }
    } catch (e) {
      showNotification('Failed to delete photo. Please try again.', 'error');
    }
  }

  async function scanBarcodeInPOS() {
    const barcode = prompt('Enter or scan barcode/product name:');
    if (!barcode) return;
    
    try {
      showNotification('🔍 Searching for product...', 'info');
      
      const res = await fetch(API(`/api/products/barcode/${encodeURIComponent(barcode)}`));
      
      if (res.ok) {
        const product = await res.json();
        
        // Ensure product has proper ID structure
        const formattedProduct = {
          ...product,
          id: product.id || product._id,
          _id: product.id || product._id
        };
        
        addToCart(formattedProduct);
        showNotification(`✓ "${product.name}" added to cart!`, 'success');
      } else {
        const error = await res.json();
        showNotification(`❌ ${error.error || 'Product not found'}`, 'error');
      }
    } catch (e) {
      showNotification('❌ Barcode scan failed. Please try again.', 'error');
    }
  }

  function printBarcode() {
    if (!barcodeImage) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode - ${barcodeProduct?.name}</title>
          <style>
            body { 
              display: flex; 
              flex-direction: column;
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .barcode-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 8px;
            }
            h2 { margin: 10px 0; }
            .price { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
            @media print {
              .no-print { display: none; }
              .barcode-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <h2>${barcodeProduct?.name}</h2>
            <img src="${barcodeImage}" alt="Barcode" />
            <div class="price">₹${barcodeProduct?.price?.toFixed(1)}</div>
          </div>
          <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
            Print
          </button>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Debug log to track rendering
  console.log('App render state:', { loading, isAuthenticated, globalError: !!globalError });

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg,#111,#444)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden'
      }}>
        {/* Animated Background Circles */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          top: '-100px',
          right: '-100px',
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          bottom: '-50px',
          left: '-50px',
          animation: 'float 4s ease-in-out infinite reverse'
        }}></div>

        {/* Main Loading Container */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Spinner */}
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 30px',
            border: '6px solid rgba(255, 255, 255, 0.3)',
            borderTop: '6px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>

          {/* Logo/Icon */}
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
            animation: 'pulse 2s ease-in-out infinite'
          }}><Icon name="analytics" size={48} /></div>

          {/* Title */}
          <h1 style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            letterSpacing: '1px'
          }}>
            Inventory Management
          </h1>

          {/* Subtitle */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            margin: '0 0 20px 0',
            fontWeight: '300'
          }}>
            Loading your workspace...
          </p>

          {/* Loading Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '20px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'white',
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: '0s'
            }}></div>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'white',
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: '0.2s'
            }}></div>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'white',
              animation: 'bounce 1.4s ease-in-out infinite',
              animationDelay: '0.4s'
            }}></div>
          </div>
        </div>

        {/* Add Keyframe Animations */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-12px); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }

          /* Chart tooltip hover effect */
          .chart-bar:hover .chart-tooltip {
            opacity: 1 !important;
          }
        `}</style>
      </div>
    )
  }

  // Show login/register as single page component when not authenticated
  if (!isAuthenticated) {
    return (
      <Login
        showLoginPage={showLoginPage}
        setShowLoginPage={setShowLoginPage}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        handleAuth={handleAuth}
        registerUsername={registerUsername}
        setRegisterUsername={setRegisterUsername}
        
        registerPassword={registerPassword}
        setRegisterPassword={setRegisterPassword}
        registerEmail={registerEmail}
        setRegisterEmail={setRegisterEmail}
        handleRegister={handleRegister}
        
        registerError={registerError}
      />
    )
  }

  return (
    <div className={`app`} style={{minHeight:'100vh', background: 'var(--bg, #f8f9fa)'}}>
      {globalError && (
        <div className="error-overlay">
          <div className="panel">
            <h3>Something went wrong — app is unstable</h3>
            <p>We detected an unexpected error. This prevents the interface from rendering correctly. You can try reloading the page or reset local data.</p>
            <pre style={{whiteSpace:'pre-wrap', fontSize:12, background:'transparent', borderRadius:6, padding:8, color:'var(--muted)'}}>{globalError.message}{globalError.stack ? '\n\n' + globalError.stack : ''}</pre>
            <div className="actions" style={{display:'flex', justifyContent:'flex-end', gap:12}}>
              <button className="btn-reset" onClick={() => { try { localStorage.clear(); } catch(e){} window.location.reload(); }}>Clear local data & Reload</button>
              <button className="btn-reload" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty card modal removed */}
      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          background: 'var(--card-2)',
          color: 'var(--text)',
          padding: '15px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          zIndex: 10000,
          maxWidth: '300px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            <Icon name="phone" /> Install App
          </div>
          <div style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
            Install this app for offline access and better performance
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={installPWA}
              style={{
                background: 'var(--brand-blue-1)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Install
            </button>
            <button 
              onClick={() => setShowInstallPrompt(false)}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Registration confirmation popup - displayed after successful registration */}
      {showRegisterConfirmation && (
        <div className="modal-overlay" onClick={()=>setShowRegisterConfirmation(false)} style={{zIndex: 10000}}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()} style={{maxWidth: '520px'}}>
            <h2>Registration Submitted</h2>
            <div style={{marginTop:12, color:'#333'}}>
              Your registration has been submitted successfully. An admin must approve your account before you can log in — you will be notified by email once approved.
            </div>
            <div className="modal-actions" style={{marginTop:20}}>
              <button onClick={() => { setShowRegisterConfirmation(false); setShowLoginPage(true) }} className="btn-primary">Okay</button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Status Indicator */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-2)',
          color: 'var(--text)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          animation: 'pulse 2s infinite',
          maxWidth: '220px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="close" /> Offline Mode
            <button
              onClick={async () => {
                await Promise.all([
                  fetchProducts(),
                  fetchCustomers(), 
                  fetchInvoices(true),
                  fetchStats()
                ])
                await loadOfflineTransactions()
                setLastDataRefresh(new Date())
                showNotification('🔄 Offline data refreshed!', 'info')
              }}
              style={{
                background: 'var(--brand-blue-1)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="Refresh cached data"
            >
              🔄
            </button>
          </div>
          {lastDataRefresh && (
            <div style={{ 
              fontSize: '10px', 
              opacity: 0.8, 
              marginTop: '4px',
              fontWeight: 'normal'
            }}>
              Last updated: {lastDataRefresh.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Sync Status Indicator */}
      {isSyncing && (
        <div style={{
          position: 'fixed',
          top: isOnline ? '20px' : '60px',
          left: '20px',
          background: '#4ecdc4',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(78,205,196,0.3)',
          animation: 'pulse 1s infinite'
        }}>
          🔄 Syncing...
        </div>
      )}

      {/* Offline Transactions Counter */}
      {offlineTransactions.length > 0 && isAuthenticated && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: isOnline ? '120px' : '160px',
            background: '#ffa726',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(255,167,38,0.3)',
            cursor: 'pointer'
          }}
        onClick={() => showNotification(`${offlineTransactions.length} transactions pending sync`, 'info')}
        title="Click to view pending transactions"
        >
          <Icon name="products" /> {offlineTransactions.length}
        </div>
      )}

      {/* Dark theme removed — no UI toggle shown */}

      {/* PWA Install Button */}
      {isAuthenticated && showInstallPrompt && (
        <button
          onClick={installPWA}
          style={{
            position: 'fixed',
            top: '20px',
            right: '80px',
            zIndex: 9999,
            background: 'var(--accent-gradient)',
            color: '#fff',
            border: 'none',
            borderRadius: '25px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          title="Install App"
        >
          <Icon name="download" size={18} />
          Install App
        </button>
      )}
      
      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type} slide-in`}>
          <span className="notification-icon">
            {notification.type === 'success' && '✓'}
            {notification.type === 'error' && '✕'}
            {notification.type === 'warning' && '⚠'}
            {notification.type === 'info' && 'ℹ'}
          </span>
          <span className="notification-message">{notification.message}</span>
          <button className="notification-close" onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      {/* Quick Actions removed per request */}

      {/* Stock Alert Modal removed */}

      {/* Product Details Modal */}
      {showProductDetails && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowProductDetails(false)}>
          <div className="modal product-details-modal slide-in" onClick={e => e.stopPropagation()}>
            <h2><Icon name="products" size={20} /> {selectedProduct.name}</h2>
            <div className="product-details-grid">
              <div className="detail-row">
                <span className="detail-label">Barcode:</span>
                <span className="detail-value">{selectedProduct.barcode || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cost Price:</span>
                <span className="detail-value">₹{selectedProduct.cost}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Selling Price:</span>
                <span className="detail-value">₹{selectedProduct.price}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Profit:</span>
                <span
                  className="detail-value profit"
                  style={{
                    color: selectedProduct.profit < 0 ? 'var(--accent-danger)' : selectedProduct.profit > 0 ? 'var(--accent-success)' : '#6b7280'
                  }}
                >
                  ₹{selectedProduct.profit} ({selectedProduct.profitPercent}%)
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Current Stock:</span>
                <span className={`detail-value ${selectedProduct.quantity < 10 ? 'low-stock-text' : ''}`}>
                  {selectedProduct.quantity} units
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Minimum Stock:</span>
                <span className="detail-value">10 units</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GST Rate:</span>
                <span className="detail-value">{selectedProduct.gstRate}%</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <span className={`detail-value ${selectedProduct.quantity === 0 ? 'out-of-stock-text' : selectedProduct.quantity < 10 ? 'low-stock-text' : 'in-stock-text'}`}>
                  {selectedProduct.quantity === 0 ? 'Out of Stock' : selectedProduct.quantity < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
              <div className="modal-actions" style={{alignItems: 'center', gap: 12}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <label style={{fontSize:12, color:'#666'}}>Qty</label>
                  <input type="number" min="1" max={selectedProduct.quantity || 999} value={modalAddQty} onChange={(e)=> setModalAddQty(Math.max(1, parseInt(e.target.value || '1')))} style={{width:72,padding:'8px 10px',borderRadius:8,border:'1px solid #e2e8f0'}} />
                </div>
                <button onClick={() => {
                  quickAddToCart(selectedProduct, modalAddQty || 1);
                  setShowProductDetails(false);
                  setModalAddQty(1);
                }} className="btn-primary important-btn btn-icon" disabled={selectedProduct.quantity === 0}>
                  <Icon name="add"/> <span className="label">Add to Cart</span>
                </button>
              <button onClick={() => setShowProductDetails(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      <header>
        <div style={{display:'flex', alignItems:'center', gap:'16px', flex:1}}>
          <h1 style={{
            margin:0, 
            display:'flex', 
            alignItems:'center', 
            gap:'8px',
            fontSize:'24px',
            fontWeight:'bold',
            color:'white'
          }}>
            <Icon name="dashboard" size={26} /> 26:07 Electronics
          </h1>
        </div>
        <div className="header-controls">
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            {/* Profile Photo Circle */}
            {isAuthenticated && (
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div 
                  onClick={()=>{ const fi = document.getElementById('header-photo-upload'); if(fi) fi.click() }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  title="Click to change photo"
                >
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Profile" 
                      style={{width:'100%',height:'100%',objectFit:'cover'}}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        setProfilePhoto(null);
                      }}
                    />
                  ) : (
                    <span style={{color:'#0b5cff',fontWeight:'bold',fontSize:16}}>
                      {(currentUser?.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <input 
                  id="header-photo-upload"
                  type="file" 
                  accept="image/*" 
                  style={{display:'none'}} 
                  onChange={async (e)=>{
                    const f = e.target.files && e.target.files[0]
                    if (!f) return
                    const reader = new FileReader()
                    reader.onload = () => setProfilePhoto(reader.result)
                    reader.readAsDataURL(f)
                    if (isOnline && currentUser && (currentUser.id || currentUser._id)) {
                      try { await uploadProfilePhoto(f) } catch(err) { console.error('Photo upload failed:', err) }
                    }
                  }} 
                />
                <span style={{color:'white',fontWeight:600,fontSize:14}}>{currentUser?.username || 'User'}</span>
              </div>
            )}
            {/* Cart toggle */}
            <button aria-label="Open cart" title="Open cart" className="header-cart-btn" onClick={() => setCartOpen(s=>!s)} style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600
            }}>
              <Icon name="cart" />
              {cartCount > 0 && <span style={{
                background: '#ef4444',
                color: 'white',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>{cartCount}</span>}
            </button>
            {/* Time display */}
            <div style={{color:'white',fontSize:13,textAlign:'right'}}>
              <div style={{fontWeight:600}}>{indiaTime}</div>
              <div style={{opacity:0.85,fontSize:11}}>{indiaDate}</div>
            </div>
            {/* Logout button */}
            {isAuthenticated && (
              <button className="logout-btn" onClick={() => { if(confirm('Are you sure you want to logout?')) handleLogout() }}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <main>
        {/* Horizontal Navigation Bar */}
        <nav className="horizontal-nav" aria-label="Main navigation">
          <div className="horizontal-nav-inner">
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('dashboard')}} className={`nav-tab ${tab==='dashboard' ? 'active' : ''}`}><Icon name="dashboard"/> <span>Dashboard</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('pos')}} className={`nav-tab ${tab==='pos' ? 'active' : ''}`}><Icon name="pos"/> <span>Transactions</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('products')}} className={`nav-tab ${tab==='products' ? 'active' : ''}`}><Icon name="products"/> <span>Products</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('inventory')}} className={`nav-tab ${tab==='inventory' ? 'active' : ''}`}><Icon name="analytics"/> <span>Inventory</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('customers')}} className={`nav-tab ${tab==='customers' ? 'active' : ''}`}><Icon name="customers"/> <span>Customers</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('invoices')}} className={`nav-tab ${tab==='invoices' ? 'active' : ''}`}><Icon name="invoices"/> <span>Invoices</span></button>
            <button onClick={async ()=>{if(await checkUserValidity()){handleTabChange('analytics');fetchAnalyticsData(analyticsDateRange);}}} className={`nav-tab ${tab==='analytics' ? 'active' : ''}`}><Icon name="analytics"/> <span>Analytics</span></button>
            <button onClick={async ()=>{if(await checkUserValidity())handleTabChange('reports')}} className={`nav-tab ${tab==='reports' ? 'active' : ''}`}><Icon name="reports"/> <span>Reports</span></button>
            {isAdmin && <button onClick={()=>{handleTabChange('users');setShowUserManagement(true);fetchUsers()}} className={`nav-tab ${tab==='users'?'active':''}`}><Icon name="users"/> <span>Users</span></button>}
            {isAdmin && <button onClick={()=>{handleTabChange('audit');fetchAuditLogs()}} className={`nav-tab ${tab==='audit'?'active':''}`}><Icon name="audit"/> <span>Audit</span></button>}
          </div>
        </nav>
        <div className="content">
        {tab==='dashboard' && (
          <div className="dashboard">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h2>Dashboard Overview</h2>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions" style={{display:'flex', gap:12, marginBottom:18, alignItems:'center'}}>
              <button className="btn-primary" onClick={()=>{ setShowAddProduct(true); handleTabChange('products') }}><Icon name="add"/> Add Product</button>
              <button className="btn-primary" onClick={()=>{ setShowAddCustomer(true); handleTabChange('customers') }}><Icon name="customers"/> Add Customer</button>
              <button className="btn-primary" onClick={()=>{ handleTabChange('pos') }}><Icon name="invoices"/> New Sale</button>
              <button className="btn-primary" onClick={()=>{ handleTabChange('reports') }} style={{background: 'var(--brand-blue-1)'}}><Icon name="reports"/> Reports</button>
            </div>
            <div className="stats-grid">
              <div className="stat-card scale-in" style={{animationDelay: '0s'}}>
                <div className="stat-icon"><Icon name="cash" size={24} /></div>
                <div className="stat-info">
                  <h3 style={{whiteSpace: 'nowrap'}}>{formatCurrency0(stats.totalRevenue || 0)}</h3>
                  <p>Total Revenue</p>
                </div>
              </div>
              <div className="stat-card scale-in" style={{animationDelay: '0.1s'}}>
                <div className="stat-icon"><Icon name="invoices" size={24} /></div>
                <div className="stat-info">
                  <h3>{stats.totalInvoices || 0}</h3>
                  <p>Total Invoices</p>
                </div>
              </div>
              {/* low-stock KPI removed (per user request) */}
              <div className="stat-card scale-in" style={{animationDelay: '0.3s'}}>
                <div className="stat-icon"><Icon name="analytics" size={24} /></div>
                <div className="stat-info">
                  <h3 style={{whiteSpace: 'nowrap'}}>{formatCurrency0(stats.todaySales || 0)}</h3>
                  <p>Today's Sales</p>
                </div>
              </div>

              <div className="stat-card scale-in" style={{animationDelay: '0.4s'}}>
                <div className="stat-icon"><Icon name="cash" size={24} /></div>
                <div className="stat-info">
                  <h3 style={{whiteSpace: 'nowrap'}}>{formatCurrency0(stats.todayProfit || 0)}</h3>
                  <p>Today's Profit</p>
                </div>
              </div>
            </div>

            {/* Dashboard widgets removed: Low Stock, Top Selling, Flow diagram, and Recent Activity */}

            {/* Mobile sidebar overlay backdrop - only used when sidebar opened via mobile button */}
            {mobileSidebarOpen && (
              <div className="mobile-sidebar-backdrop" onClick={()=>setMobileSidebarOpen(false)}></div>
            )}

            {/* Removed Low Stock alert section from dashboard */}
          </div>
        )}

        {tab==='pos' && (
          <div className="pos">
            <div className="left">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px'}}>
                <h2 style={{margin: 0}}>Products</h2>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0',
                      fontSize: '13px',
                      width: '200px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                  <button
                    onClick={scanBarcodeInPOS}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--accent-success-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    title="Enter barcode manually"
                  >
                    <Icon name="analytics" size={16} /> Barcode
                  </button>
                            <button 
                    onClick={() => {
                      setScannerMode('pos');
                      setShowBarcodeScanner(true);
                    }}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--accent-gradient)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    title="Scan barcode/QR code"
                  >
                    <Icon name="analytics" size={16} /> Scan
                  </button>
                </div>
              </div>
              <ul className="products">
                {products
                  .filter(p => searchQuery === '' || 
                    p.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((p, idx)=> (
                    <li key={p.id} className="fade-in" style={{position: 'relative', animationDelay: `${idx * 0.03}s`}}>
                      {p.quantity === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#feb2b2',
                          color: '#742a2a',
                          fontSize: '10px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          OUT
                        </div>
                      )}
                      {p.quantity > 0 && p.quantity < 10 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#feebc8',
                          color: '#7c2d12',
                          fontSize: '10px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          LOW
                        </div>
                      )}
                      {(p.photo || p.photoUrl) && (
                        <div style={{
                          width: '100%',
                          height: '120px',
                          marginBottom: '8px',
                          overflow: 'hidden',
                          borderRadius: '8px',
                          background: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img 
                            src={(p.photo || p.photoUrl).startsWith('http') ? (p.photo || p.photoUrl) : API(p.photo || p.photoUrl)} 
                            alt={p.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div><strong>{p.name}</strong></div>
                      {p.barcode && <div style={{fontSize: '10px', color: '#999', fontFamily: 'monospace'}}><Icon name="analytics" size={10} /> {p.barcode}</div>}
                      <div>Qty: {p.quantity} • ₹{p.price}</div>
                      <button 
                        onClick={()=>{
                          addToCart(p);
                          showNotification(`Added ${p.name} to cart`, 'info');
                        }}
                        disabled={p.quantity === 0}
                        style={{opacity: p.quantity === 0 ? 0.5 : 1, cursor: p.quantity === 0 ? 'not-allowed' : 'pointer'}}
                      >
                        {p.quantity === 0 ? <><Icon name="close" size={16} /> Out of Stock</> : '➕ Add'}
                      </button>
                    </li>
                  ))
                }
              </ul>
            </div>
            <div className="right">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: 8}}>
                <h2 style={{margin:0, fontSize: '18px'}}>Cart</h2>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  {/* Cart is toggled from header; removed duplicate open button from POS */}
                </div>
              </div>
              
              {/* Customer Selection */}
              <div className="form-group">
                <label>Customer:</label>
                <div className="customer-inline-wrapper">
                  <select className="customer-select-inline" value={selectedCustomer?.id || ''} onChange={e=> {
                  const cust = customers.find(c=>c.id==e.target.value);
                  setSelectedCustomer(cust);
                  }}>
                  <option value="">Walk-in Customer</option>
                  {customers.map(c=> <option key={c.id} value={c.id}>{c.name}{c.place ? ` — ${c.place}` : ''}</option>)}
                  </select>
                    <button onClick={()=>{ setShowAddCustomer(true); }} type="button" className="customer-add-btn">➕ Add</button>
                    {/* Loyalty card view removed */}
                </div>
                  {/* Loyalty feature removed */}
              </div>

              {/* Cart Items now shown in sliding drawer; this section contains a short preview */}
              <div style={{padding: '8px 0'}}>
                {cart.length === 0 ? (
                  <div style={{color:'#666'}}>Your cart is empty. Use the products list to add items.</div>
                ) : (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      {/* compact cart preview removed — open full cart via header */}
                    </div>
                )}
              </div>
              {/* Items are now shown in the Cart Drawer (Open Cart) */}
              

              {/* Discount Section */}
              <div className="form-group">
                <label>Discount: {discount}%</label>
                <input type="range" min="0" max="50" value={discount}
                       onChange={(e)=>setDiscount(parseFloat(e.target.value))}
                       style={{width:'100%'}} />
              </div>

              {/* GST Rate (fixed 18% — not editable) */}
              <div className="form-group" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <label style={{marginRight:'8px'}}>GST Rate:</label>
                <div style={{padding:'8px 12px', background:'#f1f5f9', borderRadius:'8px', border:'1px solid #e2e8f0', fontWeight:600}}>18% (Fixed)</div>
              </div>

              {/* Seller Selection */}
              <div className="form-group">
                <label>Seller:</label>
                <select 
                  value={selectedSeller || (isAdmin ? 'admin' : currentUser?.username || '')} 
                  onChange={(e) => setSelectedSeller(e.target.value)}
                >
                  {isAdmin && <option value="admin">Admin</option>}
                  {users.filter(u => u.approved).map(user => (
                    <option key={user._id} value={user.username}>
                      {user.username} {user.role !== 'cashier' ? `(${user.role})` : ''}
                    </option>
                  ))}
                  {!isAdmin && currentUser && (
                    <option value={currentUser.username}>{currentUser.username}</option>
                  )}
                </select>
              </div>

              {/* Payment Mode */}
              <div className="form-group">
                <label>Payment Mode:</label>
                <select value={splitPayment ? PAYMENT_MODES.SPLIT : paymentMode} onChange={(e)=>{
                  if (e.target.value === PAYMENT_MODES.SPLIT) {
                    setSplitPayment(true);
                  } else {
                    setSplitPayment(false);
                    setPaymentMode(e.target.value);
                  }
                }}>
                  <option value={PAYMENT_MODES.CASH}><Icon name="cash" size={16} /> Cash</option>
                  <option value={PAYMENT_MODES.CARD}><Icon name="card" size={16} /> Card</option>
                  <option value={PAYMENT_MODES.UPI}><Icon name="rupee" size={16} /> UPI</option>
                  <option value={PAYMENT_MODES.SPLIT}><Icon name="cash" size={16} /> Split Payment</option>
                </select>
              </div>

              {/* Split Payment Inputs */}
              {splitPayment && cart.length > 0 && (() => {
                const subtotal = cart.reduce((s,it)=> s + it.price*it.quantity, 0);
                const discountAmount = subtotal * discount / 100;
                const afterDiscount = subtotal - discountAmount;
                const taxAmount = afterDiscount * DEFAULT_GST;
                const grandTotal = afterDiscount + taxAmount;
                const totalPaid = (parseFloat(cashAmount) || 0) + (parseFloat(upiAmount) || 0) + (parseFloat(cardAmount) || 0);
                const remaining = grandTotal - totalPaid;
                const isValid = Math.abs(remaining) <= 0.01;
                
                return (
                  <div style={{marginBottom: '15px', padding: '15px', background: '#f7fafc', borderRadius: '8px', border: isValid ? '2px solid var(--accent-success)' : '2px solid #fc8181'}}>
                    <div style={{marginBottom: '10px', fontWeight: '600', color: '#2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span>Split Payment - Total: {formatCurrency(grandTotal)}</span>
                      <button 
                        onClick={() => {
                          setCashAmount(fmt0(grandTotal));
                          setUpiAmount('0');
                          setCardAmount('0');
                        }}
                        style={{
                          padding: '5px 10px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💵 Full Cash
                      </button>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px'}}>
                      <div className="form-group" style={{marginBottom: '0'}}>
                        <label style={{fontSize: '13px'}}><Icon name="cash" size={14} /> Cash</label>
                        <input 
                          type="number" 
                          value={cashAmount} 
                          onChange={(e)=>setCashAmount(e.target.value)}
                          min="0"
                          step="0.1"
                          placeholder="0.0"
                          style={{textAlign: 'right', fontWeight: 'bold'}}
                        />
                      </div>
                      <div className="form-group" style={{marginBottom: '0'}}>
                        <label style={{fontSize: '13px'}}><Icon name="rupee" size={14} /> UPI</label>
                        <input 
                          type="number" 
                          value={upiAmount} 
                        onChange={(e)=>setUpiAmount(e.target.value)}
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        style={{textAlign: 'right', fontWeight: 'bold'}}
                      />
                    </div>
                    <div className="form-group" style={{marginBottom: '0'}}>
                      <label style={{fontSize: '13px'}}><Icon name="card" size={14} /> Card</label>
                      <input 
                        type="number" 
                        value={cardAmount} 
                        onChange={(e)=>setCardAmount(e.target.value)}
                        min="0"
                        step="0.1"
                        placeholder="0.0"
                        style={{textAlign: 'right', fontWeight: 'bold'}}
                      />
                    </div>
                    </div>
                    <div style={{
                      padding: '10px',
                      background: isValid ? '#c6f6d5' : '#fff5f5',
                      borderRadius: '5px',
                      fontWeight: '600',
                      color: isValid ? '#2f855a' : '#c53030',
                      fontSize: '14px'
                    }}>
                      {isValid ? '✓ Exact Amount' : (
                        <>
                          <Icon name="analytics" size={14} /> {remaining > 0 ? `Remaining: ${formatCurrency(Math.abs(remaining))}` : `Excess: ${formatCurrency(Math.abs(remaining))}`}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Bill Breakdown */}
              {cart.length > 0 && (() => {
                const subtotal = cart.reduce((s,it)=> s + it.price*it.quantity, 0);
                const discountAmount = subtotal * discount / 100;
                const afterDiscount = subtotal - discountAmount;
                const taxAmount = afterDiscount * DEFAULT_GST;
                const grandTotal = afterDiscount + taxAmount;
                
                return (
                  <div className="bill-breakdown">
                    <div className="breakdown-row"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
                    {discount > 0 && (
                      <>
                        <div className="breakdown-row"><span>Discount ({discount}%):</span><span style={{color: 'var(--accent-success)'}}>-{formatCurrency(discountAmount)}</span></div>
                        <div className="breakdown-row"><span>After Discount:</span><span>{formatCurrency(afterDiscount)}</span></div>
                      </>
                    )}
                    <div className="breakdown-row"><span>GST (18%):</span><span>{formatCurrency(taxAmount)}</span></div>
                  </div>
                );
              })()}
              
              <div className="total">
                Grand Total: {cart.length > 0 ? (() => {
                  const subtotal = cart.reduce((s,it)=> s + it.price*it.quantity, 0);
                  const discountAmount = (subtotal * discount / 100);
                  const afterDiscount = subtotal - discountAmount;
              const taxAmount = afterDiscount * DEFAULT_GST;
              return formatCurrency(afterDiscount + taxAmount);
            })() : '₹0.0'}
          </div>
          
          <button 
            onClick={() => requireAuth(checkout)} 
            disabled={
              cart.length === 0 || 
              !canMakeSales() || 
              checkoutLoading ||
              (splitPayment && (() => {
                const subtotal = cart.reduce((s,it)=> s + it.price*it.quantity, 0);
                const discountAmount = subtotal * discount / 100;
                const afterDiscount = subtotal - discountAmount;
                const taxAmount = afterDiscount * DEFAULT_GST;
                const grandTotal = afterDiscount + taxAmount;
                const validation = validateSplitPayment(cashAmount, upiAmount, cardAmount, grandTotal);
                return !validation.valid;
              })())
            } 
            className="btn-complete-sale"
          >
            {checkoutLoading ? (
              <>
                <span className="spinner-small"></span> Processing...
              </>
            ) : (
              <><Icon name="pos"/> <span>Complete Sale</span></>
            )}
          </button>
        </div>
      </div>
    )}        {tab==='products' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2>Product Inventory</h2>
            </div>
            
            {/* Filter and Sort Controls */}
            <div className="product-controls fade-in">
              <div className="filter-group">
                <label>Filter:</label>
                <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="control-select">
                  <option value="all">All Products ({products.length})</option>
                  <option value="low-stock">Low Stock ({products.filter(p => p.quantity > 0 && p.quantity < 10).length})</option>
                  <option value="out-of-stock">Out of Stock ({products.filter(p => p.quantity === 0).length})</option>
                  <option value="high-profit">High Profit (≥30%) ({products.filter(p => p.profitPercent >= 30).length})</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Sort By:</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="control-select">
                  <option value="name">Name (A-Z)</option>
                  <option value="stock">Stock (Low to High)</option>
                  <option value="price">Price (High to Low)</option>
                  <option value="profit">Profit (High to Low)</option>
                </select>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>SI No</th>
                  <th>Name</th>
                  <th>Stock</th>
                  {canViewProfit() && <th>Cost Price</th>}
                  <th>Selling Price</th>
                  {canViewProfit() && <th>Profit</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredProducts().map((prod, index) => (
                  <tr key={prod.id} className="fade-in table-row-hover">
                    <td>
                      <div style={{position:'relative',width:'60px',height:'60px'}}>
                        {(localProductPhotos[prod.id] || prod.photo || prod.photoUrl) ? (
                          <img 
                            src={(localProductPhotos[prod.id]) ? localProductPhotos[prod.id] : ((prod.photo || prod.photoUrl).startsWith('http') ? (prod.photo || prod.photoUrl) : API(prod.photo || prod.photoUrl))} 
                            alt={prod.name}
                            style={{
                              width:'60px',
                              height:'60px',
                              objectFit:'contain',
                              borderRadius:'8px',
                              border:'2px solid #e5e7eb',
                              background:'#f8f9fa'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.style.cssText = 'width:60px;height:60px;background:linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#9ca3af;';
                              fallback.innerHTML = 'No Image';
                              e.target.parentElement.replaceChild(fallback, e.target);
                            }}
                          />
                        ) : (
                          <div style={{
                            width:'60px',
                            height:'60px',
                            background:'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                            borderRadius:'8px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize:'24px',
                            color:'#9ca3af'
                          }}>
                            No Image
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{fontFamily:'monospace', fontSize:'0.9em'}}>{index + 1}</td>
                    <td>
                      <span onClick={() => {setSelectedProduct(prod); setShowProductDetails(true);}} style={{cursor:'pointer', textDecoration:'underline', color:'#3498db'}}>
                        {prod.name}
                      </span>
                      {prod.quantity === 0 && <span className="badge out-of-stock">Out of Stock</span>}
                      {prod.quantity > 0 && prod.quantity < 10 && <span className="badge low-stock">Low Stock</span>}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 'bold',
                        color: prod.quantity === 0 ? 'var(--accent-danger)' : prod.quantity < 10 ? 'var(--accent-warning)' : 'var(--accent-success)'
                      }}>
                        {prod.quantity}
                      </span>
                    </td>
                    {canViewProfit() && <td>₹{prod.costPrice || 0}</td>}
                    <td>₹{prod.price}</td>
                    {canViewProfit() && (
                      <td style={{
                        color: prod.profit < 0 ? 'var(--accent-danger)' : prod.profit > 0 ? 'var(--accent-success)' : '#6b7280',
                        fontWeight: 'bold'
                      }}>
                        ₹{prod.profit || 0} ({prod.profitPercent || 0}%)
                      </td>
                    )}
                    <td>
                      <button onClick={() => {setSelectedProduct(prod); setShowProductDetails(true);}} title="View product" className="btn-info icon-only" style={{marginRight:'8px', padding:0}}><Icon name="eye" size={14} /></button>
                      <button onClick={()=>requireAuth(()=>{
                        if(confirm(`Delete ${prod.name}?`)){
                          deleteProduct(prod.id);
                          addActivity('Product Deleted', prod.name);
                          showNotification(`${prod.name} deleted`, 'success');
                        }
                      })} className="btn-danger" style={{padding:'5px 10px'}}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==='inventory' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2><Icon name="products" size={20} /> Inventory Management</h2>
              <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery} 
                  onChange={e=>setSearchQuery(e.target.value)}
                  style={{padding:'8px 12px',borderRadius:'6px',border:'1px solid #ddd',minWidth:'250px'}}
                />
              </div>
            </div>

            {/* Stock Status Summary */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'15px',marginBottom:'25px'}}>
              <div style={{background:'var(--accent-success-gradient)',padding:'20px',borderRadius:'10px',color:'white',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize:'14px',opacity:'0.9'}}>In Stock</div>
                <div style={{fontSize:'32px',fontWeight:'bold',marginTop:'8px'}}>
                  {products.filter(p => p.quantity >= 10).length}
                </div>
              </div>
              <div style={{background:'var(--accent-warning)',padding:'20px',borderRadius:'10px',color:'white',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize:'14px',opacity:'0.9'}}>Low Stock</div>
                <div style={{fontSize:'32px',fontWeight:'bold',marginTop:'8px'}}>
                  {products.filter(p => p.quantity > 0 && p.quantity < 10).length}
                </div>
              </div>
              <div style={{background:'var(--accent-danger)',padding:'20px',borderRadius:'10px',color:'white',boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
                <div style={{fontSize:'14px',opacity:'0.9'}}>Out of Stock</div>
                <div style={{fontSize:'32px',fontWeight:'bold',marginTop:'8px'}}>
                  {products.filter(p => p.quantity === 0).length}
                </div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Barcode</th>
                  <th>Product Name</th>
                  <th>Current Stock</th>
                  <th>Min Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredProducts().map(prod => (
                  <tr key={prod.id} className="fade-in table-row-hover">
                    <td>
                      <div style={{position:'relative',width:'60px',height:'60px'}}>
                        {(prod.photo || prod.photoUrl) ? (
                          <img 
                            src={(prod.photo || prod.photoUrl).startsWith('http') ? (prod.photo || prod.photoUrl) : API(prod.photo || prod.photoUrl)} 
                            alt={prod.name}
                            style={{
                              width:'60px',
                              height:'60px',
                              objectFit:'contain',
                              borderRadius:'8px',
                              border:'2px solid #e5e7eb',
                              background:'#f8f9fa'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.style.cssText = 'width:60px;height:60px;background:linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#9ca3af;';
                              fallback.innerHTML = 'No Image';
                              e.target.parentElement.replaceChild(fallback, e.target);
                            }}
                          />
                        ) : (
                          <div style={{
                            width:'60px',
                            height:'60px',
                            background:'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                            borderRadius:'8px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            fontSize:'24px',
                            color:'#9ca3af'
                          }}>
                            No Image
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          style={{display:'none'}}
                          id={`photo-${prod.id}`}
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              requireAuth(() => uploadProductPhoto(prod.id, file));
                            }
                          }}
                        />
                          <button
                          onClick={() => document.getElementById(`photo-${prod.id}`).click()}
                          style={{
                            position:'absolute',
                            bottom:'-5px',
                            right:'20px',
                            width:'24px',
                            height:'24px',
                            borderRadius:'50%',
                            background:'var(--accent-primary)',
                            color:'white',
                            border:'2px solid white',
                            cursor:'pointer',
                            fontSize:'12px',
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            padding:0
                          }}
                          title="Upload photo"
                        >
                          <Icon name="analytics" size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{fontFamily:'monospace', fontSize:'0.9em'}}>
                      {prod.barcode || 'Auto-generated'}
                      {prod.barcode && (
                        <div style={{fontSize:'0.75em',color:'#666'}}>
                          <button
                            onClick={() => showProductBarcode(prod)}
                            style={{
                              background:'none',
                              border:'none',
                              color:'var(--accent-primary)',
                              cursor:'pointer',
                              padding:0,
                              textDecoration:'underline',
                              fontSize:'0.85em'
                            }}
                          >
                            <Icon name="analytics" size={12} /> View Barcode
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{prod.name}</strong>
                      {prod.category ? (
                        <div style={{fontSize:'0.85em',color:'#666'}}>{prod.category}</div>
                      ) : null}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: prod.quantity === 0 ? '#ef4444' : prod.quantity < 10 ? '#f59e0b' : '#10b981'
                      }}>
                        {prod.quantity}
                      </span>
                    </td>
                    <td style={{color:'#666'}}>10</td>
                    <td>
                      {prod.quantity === 0 && <span className="badge out-of-stock">Out of Stock</span>}
                      {prod.quantity > 0 && prod.quantity < 10 && <span className="badge low-stock">Low Stock</span>}
                      {prod.quantity >= 10 && <span className="badge in-stock">In Stock</span>}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                        <input 
                          type="number" 
                          defaultValue={prod.quantity}
                          min="0"
                          style={{width:'80px',padding:'6px',borderRadius:'4px',border:'1px solid #ddd'}}
                          id={`qty-${prod.id}`}
                        />
                        <button 
                          onClick={()=>requireAuth(()=>{
                            const inputEl = document.getElementById(`qty-${prod.id}`);
                            const newQuantity = parseInt(inputEl.value) || 0;
                            if(newQuantity === prod.quantity) {
                              showNotification('No change in quantity', 'info');
                              return;
                            }
                            if(confirm(`Update stock for ${prod.name}?\n\nCurrent: ${prod.quantity}\nNew: ${newQuantity}`)){
                              updateStock(prod.id, newQuantity);
                              addActivity('Stock Updated', `${prod.name}: ${prod.quantity} → ${newQuantity}`);
                              showNotification(`✅ Stock updated: ${prod.name} now has ${newQuantity} units`, 'success');
                            }
                          })}
                          className="btn-primary" 
                          style={{padding:'6px 12px',whiteSpace:'nowrap'}}
                        >
                          <Icon name="check" size={16} /> Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {getFilteredProducts().length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:'48px',marginBottom:'16px'}}>No Products</div>
                      <div style={{fontSize:'18px',color:'#666',marginBottom:'8px',fontWeight:'500'}}>
                        {searchQuery ? 'No products found' : 'No products yet'}
                      </div>
                      <div style={{fontSize:'14px',color:'#999'}}>
                        {searchQuery ? 'Try a different search term' : 'Click "Add Product" to get started with your inventory'}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab==='customers' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2>Customers</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th>Place</th>
                  <th>Address</th>
                  {/* Loyalty column removed */}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c=> (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td style={{fontFamily:'monospace', fontSize:'0.9em'}}>{c.gstin || 'N/A'}</td>
                    <td style={{maxWidth:'200px', color:'#444', fontSize:13}}>{c.place || '—'}</td>
                    <td style={{maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis'}}>{c.address}</td>
                    {/* Loyalty column removed */}
                    <td>
                      <button 
                        onClick={async () => {
                          setSelectedCustomerHistory(c);
                          const purchases = invoices.filter(inv => inv.customer_id === c.id);
                          setCustomerPurchases(purchases);
                          setShowCustomerHistory(true);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <Icon name="analytics" size={16} /> View History
                      </button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:'48px',marginBottom:'16px'}}><Icon name="customers" size={48} /></div>
                      <div style={{fontSize:'18px',color:'#666',marginBottom:'8px',fontWeight:'500'}}>
                        No customers yet
                      </div>
                      <div style={{fontSize:'14px',color:'#999'}}>
                        Add your first customer to start tracking sales and purchase history
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab==='analytics' && (
          <div style={{background:'#fff', padding: '18px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'30px'}}>
              <h2><Icon name="analytics" size={20} /> Analytics Dashboard</h2>
              <div>
                <label>Date Range: </label>
                <select 
                  value={analyticsDateRange} 
                  onChange={(e) => {
                    setAnalyticsDateRange(parseInt(e.target.value));
                    fetchAnalyticsData(parseInt(e.target.value));
                  }}
                  style={{padding:'8px',borderRadius:'6px',border:'1px solid #ddd'}}
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
                  <option value={90}>Last 90 Days</option>
                  <option value={365}>Last Year</option>
                </select>
              </div>
            </div>

            {/* Revenue Summary Cards */}
            {analyticsData.revenueSummary && Object.keys(analyticsData.revenueSummary).length > 0 && (
              <div className="stats" style={{marginBottom:'30px'}}>
                <div className="stat-card">
                  <h3>Total Revenue</h3>
                  <p>{formatCurrency0(analyticsData.revenueSummary.totalRevenue || 0)}</p>
                </div>
                {canViewProfit() && (
                  <>
                    <div className="stat-card">
                      <h3>Total Profit</h3>
                      <p>{formatCurrency0(analyticsData.revenueSummary.totalProfit || 0)}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Profit Margin</h3>
                      <p>{analyticsData.revenueSummary.profitMargin || '0'}%</p>
                    </div>
                  </>
                )}
                <div className="stat-card">
                  <h3>Total Orders</h3>
                  <p>{analyticsData.revenueSummary.totalBills || '0'}</p>
                </div>
                <div className="stat-card">
                  <h3>Avg Order Value</h3>
                  <p>{formatCurrency0(analyticsData.revenueSummary.averageOrderValue || 0)}</p>
                </div>
              </div>
            )}

            {/* Top Products */}
            {analyticsData.topProducts && analyticsData.topProducts.length > 0 && (
              <div style={{marginBottom:'30px',background:'#fff',padding:'20px',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                <h3>Top Selling Products</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                      {canViewProfit() && <th>Profit</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topProducts.map((product, idx) => (
                      <tr key={idx}>
                        <td>{product.name}</td>
                        <td>{product.quantity}</td>
                        <td>₹{(product.revenue || 0).toLocaleString()}</td>
                        {canViewProfit() && <td>₹{((product.profit || 0)).toLocaleString()}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Low Stock Items */}
            {analyticsData.lowStock && analyticsData.lowStock.length > 0 && (
              <div style={{background:'#fff',padding:'20px',borderRadius:'8px',boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                <h3>Low Stock Alerts</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Current Stock</th>
                      <th>Min Stock</th>
                      <th>Shortage</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.lowStock.map((item, idx) => (
                      <tr key={idx} style={{background:item.currentStock === 0 ? '#fee' : '#fff8e1'}}>
                        <td>{item.name}</td>
                        <td>{item.currentStock}</td>
                        <td>{item.minStock}</td>
                        <td style={{color:'red',fontWeight:'bold'}}>{item.shortage}</td>
                        <td>
                          <button 
                            onClick={() => {
                              setTab('products');
                              setSearchQuery(item.name);
                            }}
                            style={{padding:'6px 12px',background:'var(--accent-primary)',color:'#fff',border:'none',borderRadius:'4px',cursor:'pointer'}}
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(!analyticsData.revenueSummary || Object.keys(analyticsData.revenueSummary).length === 0) && (
              <div className="empty-state">
                <div className="empty-icon"><Icon name="analytics" size={48} /></div>
                <h3>No Analytics Data Yet</h3>
                <p>Make some sales to see analytics insights</p>
                <button onClick={() => setTab('pos')} style={{marginTop:'20px',padding:'12px 24px',background:'var(--accent-primary)',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer'}}>
                  Start Selling →
                </button>
              </div>
            )}
          </div>
        )}

        {tab==='reports' && (
          <div>
            <h2>Reports & Analytics</h2>
            
            {/* Download Reports Section */}
            <div className="download-reports-section">
              <h3>Download Reports</h3>
              <p style={{color:'#666',marginBottom:'20px'}}>Export professional reports in CSV format</p>
              <div className="download-buttons-grid">
                <button onClick={downloadSalesCSV} className="download-btn sales">
                  <span className="btn-icon"><Icon name="analytics" size={16} /></span>
                  <div>
                    <strong>Sales Report (CSV)</strong>
                    <small>All invoices with profit details</small>
                  </div>
                </button>
                <button onClick={downloadInventoryCSV} className="download-btn inventory">
                  <span className="btn-icon"><Icon name="products" size={16} /></span>
                  <div>
                    <strong>Inventory Report (CSV)</strong>
                    <small>Stock levels & pricing</small>
                  </div>
                </button>
                {/* Products PDF export removed; use CSV Inventory or other reports */}
                <button onClick={downloadCustomerCSV} className="download-btn customers">
                  <span className="btn-icon"><Icon name="customers" size={16} /></span>
                  <div>
                    <strong>Customer Report</strong>
                    <small>Customer database</small>
                  </div>
                </button>
                {/* Profit Analysis removed — exports are now CSV-only using Sales/Inventory/Customer reports */}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="reports-grid" style={{marginTop:'30px'}}>
              <div className="report-card">
                <h3><Icon name="analytics" size={20} /> Sales Summary</h3>
                <p>Total Revenue: {formatCurrency0(stats.totalRevenue || 0)}</p>
                <p>Total Invoices: {stats.totalInvoices || 0}</p>
                <p>Average Sale: ₹{stats.totalInvoices > 0 ? Math.round(stats.totalRevenue / stats.totalInvoices) : 0}</p>
              </div>
              <div className="report-card">
                <h3><Icon name="products" size={20} /> Inventory Status</h3>
                <p>Total Products: {stats.totalProducts || 0}</p>
                <p>Low Stock Items: {stats.lowStockCount || 0}</p>
                <p>Well Stocked: {(stats.totalProducts || 0) - (stats.lowStockCount || 0)}</p>
              </div>
              <div className="report-card">
                <h3><Icon name="customers" size={20} /> Customer Insights</h3>
                <p>Total Customers: {stats.totalCustomers || 0}</p>
                <p>Today's Sales: {formatCurrency0(stats.todaySales || 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {tab==='invoices' && (
          <div className="invoices-tab">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2><Icon name="invoices" size={24} /> Invoices</h2>
              <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                <select 
                  value={invoiceDateFilter} 
                  onChange={(e) => setInvoiceDateFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
                <div style={{display:'flex', gap: 8, alignItems: 'center'}}>
                  <button className={`btn-secondary ${transactionsView === 'table' ? 'active' : ''}`} onClick={() => setTransactionsView('table')} title="Table view">Table</button>
                  <button className={`btn-secondary ${transactionsView === 'cards' ? 'active' : ''}`} onClick={() => setTransactionsView('cards')} title="Card grid view">Cards</button>
                </div>
                {invoiceDateFilter === 'custom' && (
                  <>
                    <input 
                      type="date" 
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    />
                    <span>to</span>
                    <input 
                      type="date" 
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0',
                        fontSize: '14px'
                      }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid" style={{marginBottom:'30px'}}>
              <div className="stat-card">
                <div className="stat-icon"><Icon name="invoices" size={24} /></div>
                <div className="stat-info">
                  <h3>{getFilteredInvoices().length}</h3>
                  <p>Total Invoices</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Icon name="cash" size={24} /></div>
                <div className="stat-info">
                  <h3>{formatCurrency0(getFilteredInvoices().reduce((sum, inv) => sum + (inv.total || 0), 0))}</h3>
                  <p>Total Revenue</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Icon name="analytics" size={24} /></div>
                <div className="stat-info">
                  <h3>{formatCurrency0(getFilteredInvoices().length > 0 ? Math.round(getFilteredInvoices().reduce((sum, inv) => sum + (inv.total || 0), 0) / getFilteredInvoices().length) : 0)}</h3>
                  <p>Average Sale</p>
                </div>
              </div>
            </div>

            {/* Invoices List (alternate views) */}
            {transactionsView === 'table' ? (
              <div className="table-container">
                <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>GST</th>
                    <th>Total</th>
                    <th>Profit</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredInvoices().length === 0 && (
                    <tr>
                      <td colSpan="11" style={{textAlign:'center',padding:'40px',color:'#999'}}>
                        No invoices found for selected period
                      </td>
                    </tr>
                  )}
                  {getFilteredInvoices().length > 0 && [...getFilteredInvoices()].slice().sort((a,b)=> new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).map(inv => {
                      // Use server-provided totalProfit if present, otherwise compute a best-effort fallback from item prices/costs
                      const profit = typeof inv.totalProfit === 'number'
                        ? inv.totalProfit
                        : ( (inv.items || []).reduce((s, it) => s + ((it.price || it.unitPrice || 0) - (it.costPrice || it.cost || 0)) * (it.quantity || 0), 0) - (inv.discountAmount || 0) );

                      return (
                      <tr key={inv.id || inv._id}>
                        <td><strong>#{inv.id || inv.billNumber}</strong></td>
                        <td>{new Date(inv.created_at || inv.date).toLocaleDateString()}</td>
                        <td>{inv.customer_name || inv.customerName || 'Walk-in'}</td>
                        <td>{inv.items?.length || 0} items</td>
                        <td>{formatCurrency0(inv.subtotal || 0)}</td>
                        <td>
                          <span style={{color:'var(--accent-danger)',fontSize:'13px'}}>
                            -{inv.discountPercent || 0}%
                            <br/>
                            <small style={{color:'#888'}}>{formatCurrency0(inv.discountAmount || 0)}</small>
                          </span>
                        </td>
                        <td>
                          <span style={{color:'#27ae60',fontSize:'13px'}}>
                            +{inv.taxRate || 0}%
                            <br/>
                            <small style={{color:'#888'}}>{formatCurrency0(inv.taxAmount || 0)}</small>
                          </span>
                        </td>
                        <td><strong style={{color:'#2c3e50'}}>{formatCurrency0(inv.total || inv.grandTotal || 0)}</strong></td>
                        {/* removed duplicated Actions column (was misaligned under GST) */}
                        <td>
                          <span style={{color:'#27ae60',fontSize:'13px'}}>
                            +{inv.taxRate || 0}%
                            <br/>
                            <small style={{color:'#888'}}>{formatCurrency0(inv.taxAmount || 0)}</small>
                          </span>
                        </td>
                        <td><strong style={{color:'#2c3e50'}}>{formatCurrency0(inv.total || inv.grandTotal || 0)}</strong></td>
                        <td>
                          <strong style={{color: profit < 0 ? 'var(--accent-danger)' : 'var(--accent-success)'}}>
                            {formatCurrency0(profit || 0)}
                          </strong>
                        </td>
                        <td>
                          {(inv.paymentMode === 'split' || inv.paymentMode === 'Split') && inv.splitPaymentDetails ? (
                            <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                              <span className="badge info" style={{fontSize:'11px'}}><Icon name="cash" size={10} /> Split Payment</span>
                              <div style={{fontSize:'10px',color:'#666',display:'flex',flexDirection:'column',gap:'2px'}}>
                                {inv.splitPaymentDetails.cashAmount > 0 && (
                                  <span><Icon name="cash" size={10} /> Cash: ₹{formatCurrency0(inv.splitPaymentDetails.cashAmount)}</span>
                                )}
                                {inv.splitPaymentDetails.upiAmount > 0 && (
                                  <span><Icon name="rupee" size={10} /> UPI: ₹{formatCurrency0(inv.splitPaymentDetails.upiAmount)}</span>
                                )}
                                {inv.splitPaymentDetails.cardAmount > 0 && (
                                  <span><Icon name="card" size={10} /> Card: ₹{formatCurrency0(inv.splitPaymentDetails.cardAmount)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className={`badge ${
                              inv.paymentMode === 'Cash' || inv.paymentMode === 'cash' ? 'success' : 
                              inv.paymentMode === 'UPI' || inv.paymentMode === 'upi' ? 'primary' : 
                              inv.paymentMode === 'Card' || inv.paymentMode === 'card' ? 'info' : 
                              'info'
                            }`}>
                              {inv.paymentMode === 'Cash' || inv.paymentMode === 'cash' ? <Icon name="cash" size={10} /> :
                               inv.paymentMode === 'UPI' || inv.paymentMode === 'upi' ? <Icon name="rupee" size={10} /> :
                               inv.paymentMode === 'Card' || inv.paymentMode === 'card' ? <Icon name="card" size={10} /> : null}
                              {inv.paymentMode || 'Cash'}
                            </span>
                          )}
                        </td>
                        <td className="actions-cell" style={{whiteSpace:'nowrap'}}>
                            <button
                              onClick={() => sendInvoiceWhatsApp(inv)}
                              title="Send invoice via WhatsApp"
                              className="fancy-btn whatsapp-btn icon-only"
                              style={{border:'none', cursor:'pointer', marginRight:'6px'}}
                            >
                              <Icon name="whatsapp" size={16} />
                            </button>
                            <button
                              onClick={() => { setLastBill(inv); setShowBill(true); }}
                              title="View invoice"
                              className="btn-icon icon-only"
                              style={{background:'var(--accent-primary)', color:'white', border:'none', cursor:'pointer', marginRight:4}}
                            >
                              <Icon name="eye" size={16} />
                            </button>
                        </td>
                      </tr>
                    )})
                  }
                </tbody>
                </table>
              </div>
            ) : (
              <div className="transactions-grid">
                {getFilteredInvoices().length === 0 && (
                  <div className="empty-placeholder">No invoices found for selected period</div>
                )}
                {getFilteredInvoices().length > 0 && [...getFilteredInvoices()].slice().sort((a,b)=> new Date(b.created_at || b.date) - new Date(a.created_at || a.date)).map(inv => {
                  const profit = typeof inv.totalProfit === 'number'
                        ? inv.totalProfit
                        : ( (inv.items || []).reduce((s, it) => s + ((it.price || it.unitPrice || 0) - (it.costPrice || it.cost || 0)) * (it.quantity || 0), 0) - (inv.discountAmount || 0) );

                  return (
                    <div className="transaction-card" key={inv.id || inv._id}>
                      <div className="transaction-card-header">
                        <div><strong>#{inv.id || inv.billNumber}</strong></div>
                        <div style={{fontSize:12,color:'#666'}}>{new Date(inv.created_at || inv.date).toLocaleString()}</div>
                      </div>
                      <div className="transaction-card-body">
                        <div className="tc-left">
                          <div style={{fontWeight:700}}>{inv.customer_name || inv.customerName || 'Walk-in'}</div>
                          <div style={{fontSize:12,color:'#666'}}>{(inv.items || []).length} items • {inv.paymentMode || 'Cash'}</div>
                        </div>
                        <div className="tc-right">
                          <div style={{fontWeight:700}}>{formatCurrency0(inv.total || inv.grandTotal || 0)}</div>
                          <div style={{fontSize:12,color: profit < 0 ? 'var(--accent-danger)' : 'var(--accent-success)'}}>{formatCurrency0(profit || 0)}</div>
                        </div>
                      </div>
                      <div className="transaction-card-footer">
                        <div className="transaction-actions">
                          <button onClick={() => sendInvoiceWhatsApp(inv)} className="icon-only whatsapp-btn" title="Send WhatsApp"><Icon name="whatsapp" size={16} /></button>
                          <button onClick={() => { setLastBill(inv); setShowBill(true); }} className="icon-only" title="View"><Icon name="eye" size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Users Management Tab (Admin Only) */}
        {tab==='users' && isAdmin && (
          <div className="users-management">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2><Icon name="customers" size={24} /> User Management</h2>
              <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                <span style={{color:'#000',fontSize:'14px',fontWeight:'500'}}>
                  Total Users: {users.length} | Pending: {users.filter(u=>!u.approved).length}
                </span>
                {/* Change admin password via web UI removed (password is set in code/config) */}
              </div>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{textAlign:'center',padding:'40px',color:'#999'}}>
                        No users registered yet
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user._id}>
                        <td style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{display:'inline-flex',alignItems:'center',gap:8}}>
                            <div className="user-photo-wrapper" style={{width:38,height:38,borderRadius:8,overflow:'hidden',border:'1px solid #eef2f7',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                              { (localUserPhotos[user._id] || user.photo) ? (
                                <img src={(localUserPhotos[user._id]) ? localUserPhotos[user._id] : ((user.photo||'').startsWith('http') ? user.photo : API(user.photo))} alt={user.username} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'cover',display:'block'}}/>
                              ) : (
                                <div style={{fontWeight:700,color:'var(--accent-secondary)',padding:'6px',fontSize:12}}>{String(user.username||'U').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
                              )}
                              <button className="camera-overlay" title="Set user photo" onClick={(e)=>{ e.stopPropagation(); document.getElementById(`user-photo-${user._id}`).click(); }} style={{position:'absolute',right:-6,bottom:-6}}><Icon name="camera" size={12} /></button>
                            </div>
                            <div style={{display:'flex',flexDirection:'column'}}>
                              <strong>{user.username}</strong>
                              <small style={{color:'#6b7280',fontSize:11}}>{user.role}</small>
                            </div>
                          </div>

                          {/* admin upload/delete controls for user photo */}
                          <div style={{marginLeft:'auto',display:'inline-flex',gap:6,flexWrap:'nowrap'}}>
                            <input id={`user-photo-${user._id}`} type="file" accept="image/*" style={{display:'none'}} onChange={(e)=>{ const f = e.target.files && e.target.files[0]; if(f) uploadUserPhoto(user._id, f); }} />
                              <button title="Upload" onClick={()=>document.getElementById(`user-photo-${user._id}`).click()} style={{padding:'6px',borderRadius:8,border:'none',background: 'var(--accent-success)',cursor:'pointer', color: 'white'}}><Icon name="upload" size={14}/></button>
                              <button title="Remove" onClick={()=>deleteUserPhoto(user._id)} style={{padding:'6px',borderRadius:8,border:'none',background:'var(--accent-danger)',cursor:'pointer',color:'white'}}><Icon name="close" size={14}/></button>
                          </div>
                        </td>
                        <td>{user.email || '—'}</td>
                        <td>
                          <select
                            value={user.role}
                            onChange={(e) => changeUserRole(user._id, e.target.value, user.username)}
                            style={{
                              background: user.role === 'admin' ? 'var(--accent-primary)' : user.role === 'manager' ? 'var(--accent-secondary)' : 'var(--accent-success)',
                              color: 'white',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </td>
                        <td>
                          {user.approved ? (
                            <span className="badge" style={{
                              background: 'var(--accent-success)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              <Icon name="check" size={12} /> Approved
                            </span>
                          ) : (
                            <span className="badge" style={{
                              background: 'var(--accent-warning)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              <Icon name="clock" size={12} /> Pending
                            </span>
                          )}
                        </td>
                        <td>
                          {new Date(user.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            {!user.approved ? (
                              <button 
                                onClick={() => approveUser(user._id)}
                                className="btn-success"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: 'var(--accent-success)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Icon name="check" size={12} /> Approve
                              </button>
                            ) : (
                              <button 
                                onClick={() => revokeUserAccess(user._id, user.username)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  background: 'var(--card-2)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                <Icon name="lock" size={12} /> Revoke Access
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if(window.confirm(`Delete user "${user.username}"? They will be immediately logged out and removed permanently.`)) {
                                  deleteUser(user._id);
                                }
                              }}
                              className="btn-danger"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'var(--accent-danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <Icon name="trash" size={12} /> Delete
                            </button>
                            <button 
                              onClick={() => forceLogoutUser(user.username)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                background: 'var(--card-2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              <Icon name="logout" size={12} /> Force Logout
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Logs Tab (Admin Only) */}
        {tab==='audit' && isAdmin && (
          <div className="audit-logs">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2><Icon name="audit" size={24} /> Audit Trail Logs</h2>
              <button onClick={fetchAuditLogs} className="btn-primary" style={{padding:'8px 16px'}}>
                <Icon name="refresh" size={16} /> Refresh
              </button>
            </div>
            
            <div style={{background:'white',borderRadius:'15px',padding:'20px',boxShadow:'0 4px 15px rgba(0,0,0,0.1)'}}>
              <p style={{color:'#666',marginBottom:'20px',fontSize:'14px'}}>
                Complete audit trail of all system changes. Track who made what changes and when.
              </p>
              
              <div className="table-container" style={{maxHeight:'70vh',overflowY:'auto'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{textAlign:'center',padding:'40px',color:'#999'}}>
                          No audit logs yet
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id}>
                          <td style={{fontSize:'13px',color:'#666',whiteSpace:'nowrap'}}>
                            {new Date(log.timestamp).toLocaleString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td>
                            <span style={{
                              background: log.username === 'admin' ? 'var(--accent-primary)' : 'var(--accent-success)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {log.username}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: 
                                log.action.includes('DELETE') ? '#f56565' :
                                log.action.includes('ADD') || log.action.includes('COMPLETE') ? 'var(--accent-success)' :
                                log.action.includes('UPDATE') ? 'var(--accent-warning)' : 'var(--accent-primary)',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{fontSize:'13px'}}>
                            {log.details && (
                              <div style={{maxWidth:'400px'}}>
                                {log.details.productName && <span>Product: <strong>{log.details.productName}</strong></span>}
                                {log.details.customerName && <span>Customer: <strong>{log.details.customerName}</strong></span>}
                                {log.details.billNumber && <span>Bill: <strong>{log.details.billNumber}</strong></span>}
                                {log.details.oldQuantity !== undefined && (
                                  <span> | Stock: {log.details.oldQuantity} → {log.details.newQuantity} 
                                    <span style={{
                                      color: log.details.change > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                      fontWeight: 'bold'
                                    }}>
                                      ({log.details.change > 0 ? '+' : ''}{log.details.change})
                                    </span>
                                  </span>
                                )}
                                {log.details.grandTotal && <span> | Total: ₹{log.details.grandTotal}</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {auditLogs.length > 0 && (
                <div style={{marginTop:'20px',textAlign:'center',color:'#999',fontSize:'13px'}}>
                  Showing last {auditLogs.length} activities
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Mobile bottom navigation (small screens) */}
      <div className="mobile-bottom-nav" role="navigation" aria-label="Mobile bottom navigation">
        <button onClick={async ()=>{ if(await checkUserValidity()) handleTabChange('dashboard') }} className={`${tab==='dashboard' ? 'active' : ''} btn-icon`}><Icon name="dashboard"/><small>Home</small></button>
        <button onClick={async ()=>{ if(await checkUserValidity()) handleTabChange('pos') }} className={`${tab==='pos' ? 'active' : ''} btn-icon`}><Icon name="pos"/><small>POS</small></button>
        <button onClick={async ()=>{ if(await checkUserValidity()) handleTabChange('products') }} className={`${tab==='products' ? 'active' : ''} btn-icon`}><Icon name="products"/><small>Products</small></button>
        <button onClick={async ()=>{ if(await checkUserValidity()) handleTabChange('customers') }} className={`${tab==='customers' ? 'active' : ''} btn-icon`}><Icon name="customers"/><small>Customers</small></button>
        <button onClick={async ()=>{ if(await checkUserValidity()) handleTabChange('invoices') }} className={`${tab==='invoices' ? 'active' : ''} btn-icon`}><Icon name="invoices"/><small>Invoices</small></button>
        <button aria-label="More" onClick={()=>setShowMobileMore(true)}><div>⋯</div><small>More</small></button>
      </div>

      {showMobileMore && (
        <div className="mobile-more-overlay" onClick={()=>setShowMobileMore(false)}>
          <div className="mobile-more-sheet" onClick={e=>e.stopPropagation()}>
            <button onClick={async ()=>{ setShowMobileMore(false); if(await checkUserValidity()) handleTabChange('inventory') }}><Icon name="analytics" size={16} /> Inventory</button>
            <button onClick={async ()=>{ setShowMobileMore(false); if(await checkUserValidity()){ handleTabChange('analytics'); fetchAnalyticsData(analyticsDateRange); } }}><Icon name="analytics" size={16} /> Analytics</button>
            <button onClick={async ()=>{ setShowMobileMore(false); if(await checkUserValidity()) handleTabChange('reports') }}><Icon name="analytics" size={16} /> Reports</button>
            {isAdmin && <button onClick={()=>{ setShowMobileMore(false); handleTabChange('users'); fetchUsers() }}><Icon name="customers" size={16} /> Users</button>}
            {isAdmin && <button onClick={()=>{ setShowMobileMore(false); handleTabChange('audit'); fetchAuditLogs() }}><Icon name="audit" size={16} /> Audit Logs</button>}
            <div style={{height:8}} />
            <button className="btn-secondary" onClick={()=>setShowMobileMore(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="modal-overlay" onClick={()=>setShowAddProduct(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h2>Add New Product</h2>
            <form onSubmit={(e)=>{e.preventDefault(); addProduct();}}>
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  value={newProduct.name} 
                  onChange={(e)=>setNewProduct({...newProduct, name:e.target.value})}
                  required
                  placeholder="Enter product name"
                />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input 
                  type="number" 
                  value={newProduct.quantity} 
                  onChange={(e)=>setNewProduct({...newProduct, quantity:e.target.value})}
                  required
                  min="0"
                  placeholder="Stock quantity"
                />
              </div>
              <div className="form-group">
                <label>Minimum Stock Level</label>
                <input 
                  type="number" 
                  value={newProduct.minStock} 
                  onChange={(e)=>setNewProduct({...newProduct, minStock:e.target.value})}
                  required
                  min="0"
                  placeholder="Alert when stock falls below this"
                />
              </div>
              <div className="form-group">
                <label>Cost Price (₹)</label>
                <input 
                  type="number" 
                  value={newProduct.costPrice} 
                  onChange={(e)=>setNewProduct({...newProduct, costPrice:e.target.value})}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Purchase/Cost price"
                />
              </div>
              <div className="form-group">
                <label>Selling Price (₹)</label>
                <input 
                  type="number" 
                  value={newProduct.price} 
                  onChange={(e)=>setNewProduct({...newProduct, price:e.target.value})}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Selling price to customers"
                />
              </div>
              <div className="form-group">
                <label>HSN Code</label>
                <input 
                  type="text" 
                  value={newProduct.hsnCode} 
                  onChange={(e)=>setNewProduct({...newProduct, hsnCode:e.target.value})}
                  placeholder="HSN/SAC code for GST"
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Add Product</button>
                <button type="button" onClick={()=>setShowAddProduct(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="modal-overlay" onClick={()=>setShowAddCustomer(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h2>Add New Customer</h2>
            <form onSubmit={(e)=>{e.preventDefault(); addCustomer();}}>
              <div className="form-group">
                <label>Customer Name</label>
                <input 
                  type="text" 
                  value={newCustomer.name} 
                  onChange={(e)=>setNewCustomer({...newCustomer, name:e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input 
                  type="tel" 
                  value={newCustomer.phone} 
                  onChange={(e)=>setNewCustomer({...newCustomer, phone:e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input 
                  type="text" 
                  value={newCustomer.address} 
                  onChange={(e)=>setNewCustomer({...newCustomer, address:e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>GSTIN (Optional)</label>
                <input 
                  type="text" 
                  value={newCustomer.gstin} 
                  onChange={(e)=>setNewCustomer({...newCustomer, gstin:e.target.value.toUpperCase()})}
                  placeholder="e.g., 29AABCT1234L1Z5"
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  title="Valid GSTIN format: 29AABCT1234L1Z5"
                  maxLength="15"
                />
              </div>
              <div className="form-group" style={{position:'relative'}}>
                <label>Place</label>
                <input
                  type="text"
                  value={newCustomer.place || ''}
                  onChange={(e)=>handlePlaceChange(e.target.value)}
                  placeholder="City, State, Country"
                />
                {placeLoading && <div style={{position:'absolute', right:12, top:38, fontSize:12, color:'#666'}}>Loading…</div>}
                {placeSuggestions && placeSuggestions.length > 0 && (
                  <div className="place-suggestions" style={{position:'absolute', left:0, right:0, zIndex:50, background:'#fff', border:'1px solid #e6e6e6', borderRadius:6, maxHeight:'220px', overflowY:'auto', boxShadow:'0 6px 20px rgba(0,0,0,0.08)'}}>
                    {placeSuggestions.map((p, i) => (
                      <div 
                        key={i} 
                        onClick={() => { 
                          setNewCustomer({
                            ...newCustomer, 
                            place: p.place || p.display_name, 
                            address: p.full_address || p.display_name,
                            pincode: p.postcode || newCustomer.pincode
                          }); 
                          setPlaceSuggestions([]); 
                        }} 
                        style={{
                          padding:'10px 12px', 
                          cursor:'pointer', 
                          borderBottom:'1px solid #f5f5f5',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{fontSize:13, fontWeight:500, marginBottom:4}}>{p.place || p.display_name}</div>
                        <div style={{fontSize:11, color:'#666', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <span>{p.full_address || p.display_name}</span>
                          {p.postcode && <span style={{background:'#e3f2fd', color:'#1976d2', padding:'2px 6px', borderRadius:4, fontSize:10, fontWeight:600, marginLeft:8}}>PIN: {p.postcode}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Add Customer</button>
                <button type="button" onClick={()=>setShowAddCustomer(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {showCustomerHistory && selectedCustomerHistory && (
        <div className="modal-overlay" onClick={()=>setShowCustomerHistory(false)}>
          <div className="modal-content" style={{maxWidth: '900px'}} onClick={(e)=>e.stopPropagation()}>
            <h2><Icon name="analytics" size={24} /> Purchase History - {selectedCustomerHistory.name}</h2>
            <div style={{marginBottom: '20px', padding: '15px', background: '#f7fafc', borderRadius: '8px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <p><strong>Phone:</strong> {selectedCustomerHistory.phone}</p>
                <p><strong>Place:</strong> {selectedCustomerHistory.place || '—'}</p>
                {selectedCustomerHistory.pincode && <p><strong>PIN:</strong> {selectedCustomerHistory.pincode}</p>}
                <p><strong>GSTIN:</strong> {selectedCustomerHistory.gstin || 'N/A'}</p>
                <p style={{gridColumn: '1 / -1'}}><strong>Address:</strong> {selectedCustomerHistory.address}</p>
              </div>
              <div style={{marginTop: '15px', display: 'flex', gap: '20px', justifyContent: 'center'}}>
                <div style={{textAlign: 'center', padding: '10px', background: 'white', borderRadius: '8px', flex: 1}}>
                  <div style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-primary)'}}>
                    {customerPurchases.length}
                  </div>
                  <div style={{fontSize: '12px', color: '#666'}}>Total Purchases</div>
                </div>
                <div className="form-group">
                  <label>Pin / Postal Code</label>
                  <input type="text" maxLength={10} placeholder="Enter Postal Code / PIN" value={newCustomer.pincode || ''} onChange={(e)=>setNewCustomer({...newCustomer, pincode: e.target.value})} />
                </div>
                <div style={{textAlign: 'center', padding: '10px', background: 'white', borderRadius: '8px', flex: 1}}>
                  <div style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-success)'}}>
                    {formatCurrency0(customerPurchases.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0))}
                  </div>
                  <div style={{fontSize: '12px', color: '#666'}}>Total Spent</div>
                </div>
                <div style={{textAlign: 'center', padding: '10px', background: 'white', borderRadius: '8px', flex: 1}}>
                  <div style={{fontSize: '24px', fontWeight: 'bold', color: '#f6ad55'}}>
                    {customerPurchases.length > 0 ? formatCurrency0(Math.round(customerPurchases.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0) / customerPurchases.length)) : formatCurrency0(0)}
                  </div>
                  <div style={{fontSize: '12px', color: '#666'}}>Avg Purchase</div>
                </div>
              </div>
            </div>
            
            {customerPurchases.length > 0 ? (
              <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Discount</th>
                      <th>Total Amount</th>
                      <th>Payment Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerPurchases.map(inv => (
                      <tr key={inv.id}>
                        <td>#{inv.id}</td>
                        <td>{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                        <td>{inv.items?.length || 0} items</td>
                        <td>{inv.discountPercent || 0}%</td>
                        <td style={{fontWeight: 'bold', color: 'var(--accent-primary)'}}>₹{inv.total}</td>
                        <td>{inv.paymentMode || 'Cash'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                <div style={{fontSize: '48px', marginBottom: '10px'}}><Icon name="products" size={48} /></div>
                <p>No purchase history found for this customer</p>
              </div>
            )}
            
            <div className="modal-actions" style={{marginTop: '20px'}}>
              <button onClick={()=>setShowCustomerHistory(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Bill Modal */}
      {showBill && lastBill && (
        <div className="modal-overlay" onClick={()=>setShowBill(false)} style={{zIndex: 9999}}>
          <div className="modal-content bill-modal" onClick={(e)=>e.stopPropagation()} style={{
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'white',
            position: 'relative'
          }}>
            <div id="bill-print-content">
              <div className="bill-header">
                <h2><Icon name="dashboard" size={24} /> 26:07 ELECTRONICS</h2>
                <h3>Premium Electronics & Smart Solutions</h3>
                <p>Tax Invoice</p>
              </div>
              
              <div className="bill-info">
                <p><strong>Bill No:</strong> {lastBill.billNumber}</p>
                <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
                <p><strong>Customer:</strong> {lastBill.customer_name || lastBill.customerName || 'Walk-in'}</p>
                {lastBill.customerId && (
                  {/* Loyalty feature removed */}
                )}
                {(lastBill.customerPlace || lastBill.customer_place) && <p><strong>Place:</strong> {lastBill.customerPlace || lastBill.customer_place}</p>}
                {(lastBill.customerPincode || lastBill.customer_pincode) && <p><strong>PIN:</strong> {lastBill.customerPincode || lastBill.customer_pincode}</p>}
                {(lastBill.customerPhone || lastBill.customer_phone) && <p><strong>Phone:</strong> {lastBill.customerPhone || lastBill.customer_phone}</p>}
                <p><strong>Payment Mode:</strong> {lastBill.paymentMode}</p>
              </div>

              {/* Loyalty card and discount removed from bill display */}

              <table>
                <thead>
                  <tr>
                    <th style={{textAlign:'left'}}>Item</th>
                    <th style={{textAlign:'center'}}>Qty</th>
                    <th style={{textAlign:'right'}}>Price</th>
                    <th style={{textAlign:'right'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lastBill.items && lastBill.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productName || item.name}</td>
                      <td style={{textAlign:'center'}}>{item.quantity}</td>
                      <td style={{textAlign:'right'}}>₹{item.unitPrice || item.price}</td>
                      <td style={{textAlign:'right'}}>₹{((item.unitPrice || item.price) * item.quantity).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bill-summary">
                <div><span>Subtotal:</span><span>{formatCurrency0(lastBill.subtotal)}</span></div>
                {lastBill.discountAmount > 0 && (
                  <>
                    <div><span>Discount ({lastBill.discountPercent || lastBill.discountValue}%):</span><span>- {formatCurrency0(lastBill.discountAmount)}</span></div>
                    <div><span>After Discount:</span><span>{formatCurrency0(lastBill.subtotal - lastBill.discountAmount)}</span></div>
                  </>
                )}
                <div><span>GST ({lastBill.taxRate}%):</span><span>{formatCurrency0(lastBill.taxAmount)}</span></div>
                <div className="grand-total">
                  <span><strong>Grand Total:</strong></span>
                  <span><strong>{formatCurrency0(lastBill.total)}</strong></span>
                </div>
              </div>

              <div className="bill-footer">
                <p><strong>Thank you for your business!</strong></p>
              </div>
            </div>

            <div className="modal-actions" style={{marginTop:'20px'}}>
              <button onClick={printBill} className="btn-primary important-btn btn-icon"><Icon name="print"/> <span className="label">Print Bill</span></button>
              <button
                onClick={() => { if (!lastBill) return; sendInvoiceWhatsApp(lastBill); }}
                className="btn-primary whatsapp-btn icon-only"
                title="Send via WhatsApp"
                style={{ marginLeft:'8px' }}
              >
                <Icon name="whatsapp" size={18} />
              </button>
              <button onClick={()=>setShowBill(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <div className="modal-overlay" onClick={() => {setShowBarcodeScanner(false); setScannedBarcode('');}}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2><Icon name="analytics" size={24} /> Scan Barcode/QR Code</h2>
            <div style={{marginBottom: '20px'}}>
              <div id="qr-reader" style={{width: '100%', maxWidth: '500px', margin: '0 auto'}}></div>
            </div>
            <div className="form-group">
              <label>Or Enter Barcode Manually</label>
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Enter barcode and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && scannedBarcode.trim()) {
                    handleBarcodeResult(scannedBarcode.trim());
                  }
                }}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                onClick={() => scannedBarcode.trim() && handleBarcodeResult(scannedBarcode.trim())}
                className="btn-primary"
                disabled={!scannedBarcode.trim()}
              >
                Search Product
              </button>
              <button onClick={() => {setShowBarcodeScanner(false); setScannedBarcode('');}} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode & QR Code Modal */}
      {showBarcodeModal && barcodeProduct && (
        <div className="modal-overlay" onClick={() => {setShowBarcodeModal(false); setBarcodeImage(null); setQrCodeImage(null);}}>
          <div className="modal-content" style={{maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
            <h2><Icon name="analytics" size={24} /> Product Barcode & QR Code</h2>
            
              <div style={{
              background: 'var(--accent-gradient)',
              padding: '20px',
              borderRadius: '12px',
              color: 'white',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{margin: '0 0 8px 0', fontSize: '24px'}}>{barcodeProduct.name}</h3>
              <div style={{fontSize: '32px', fontWeight: 'bold'}}>₹{barcodeProduct.price?.toFixed(1)}</div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {/* Standard Barcode */}
              <div style={{
                background: 'white',
                border: '2px dashed #ccc',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h4 style={{margin: '0 0 15px 0', color: '#333'}}>Standard Barcode</h4>
                {barcodeImage ? (
                  <img 
                    src={barcodeImage} 
                    alt="Barcode" 
                    style={{
                      width: '100%',
                      maxWidth: '250px',
                      height: 'auto'
                    }}
                  />
                ) : (
                  <div style={{padding: '40px', color: '#999'}}>
                    Loading...
                  </div>
                )}
                <div style={{
                  marginTop: '10px',
                  fontSize: '12px',
                  color: '#666',
                  fontFamily: 'monospace'
                }}>
                  {barcodeProduct.barcode}
                </div>
              </div>

              {/* QR Code */}
              <div style={{
                background: 'white',
                border: '2px dashed #ccc',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <h4 style={{margin: '0 0 15px 0', color: '#333'}}>QR Code</h4>
                {qrCodeImage ? (
                  <img 
                    src={qrCodeImage} 
                    alt="QR Code" 
                    style={{
                      width: '200px',
                      height: '200px'
                    }}
                  />
                ) : (
                  <div style={{padding: '40px', color: '#999'}}>
                    Loading...
                  </div>
                )}
                <div style={{
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#666'
                }}>
                  Scan for product info
                </div>
              </div>
            </div>

            <div style={{
              background: '#f7fafc',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px'}}>
                <div><strong>Product ID:</strong> {barcodeProduct.id}</div>
                <div><strong>Stock:</strong> {barcodeProduct.quantity} units</div>
                <div><strong>Cost Price:</strong> ₹{barcodeProduct.costPrice?.toFixed(1)}</div>
                <div><strong>Selling Price:</strong> ₹{barcodeProduct.price?.toFixed(1)}</div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={printBarcode}
                className="btn-primary important-btn btn-icon"
                disabled={!barcodeImage}
              >
                <Icon name="print"/> <span className="label">Print Barcode</span>
              </button>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${barcodeProduct.name}-barcode.png`;
                  link.href = barcodeImage;
                  link.click();
                }}
                className="btn-primary btn-icon"
                style={{background: 'var(--accent-success)'}}
                disabled={!barcodeImage}
              >
                <Icon name="download"/> <span className="label">Download Barcode</span>
              </button>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `${barcodeProduct.name}-qrcode.png`;
                  link.href = qrCodeImage;
                  link.click();
                }}
                className="btn-primary btn-icon"
                style={{background: 'var(--accent-secondary)'}}
                disabled={!qrCodeImage}
              >
                <Icon name="download"/> <span className="label">Download QR</span>
              </button>
              <button 
                onClick={() => {
                  setShowBarcodeModal(false);
                  setBarcodeImage(null);
                  setQrCodeImage(null);
                }}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copyright Footer removed as requested */}
      {/* Floating Cart Toggle */}
      {/* Floating cart toggle removed; use header cart toggle to open/close cart */}

      {/* Cart Drawer overlay */}
      {cartOpen && (
        <>
          <div className="cart-sidebar-backdrop" onClick={() => setCartOpen(false)} />
          <aside className={`cart-sidebar ${cartOpen ? 'open' : 'closed'}`} role="dialog" aria-label="Shopping cart drawer">
            <div className="cart-sidebar-header">
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <h3 style={{margin:0, fontSize: '18px'}}>Cart</h3>
                  <div style={{color:'#6b7280', fontSize:13}}>• {cart.length} items</div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:12, color:'#6b7280', fontSize:13}}>
                  <div>Customer: <strong style={{color:'#111'}}>{selectedCustomer?.name || 'Walk-in'}</strong></div>
                  <div>Sales: <strong style={{color:'#111'}}>{selectedSeller || currentUser?.name || currentUser?.username || '—'}</strong></div>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <button className="btn-secondary" onClick={() => setCartOpen(false)}>Close</button>
                <button className="btn-secondary" onClick={() => { setCart([]); }}>Clear</button>
              </div>
            </div>
            <div className="cart-sidebar-content">
              {cart.length === 0 ? (
                <div style={{padding:'40px 20px', textAlign:'center', color:'#6b7280'}}>
                  <Icon name="cart" size={48} />
                  <div style={{marginTop:'12px', fontSize:'14px'}}>Your cart is empty</div>
                  <div style={{marginTop:'6px', fontSize:'12px'}}>Add products from the POS to get started</div>
                </div>
              ) : (
                <ul className="cart-panel-list">
                  {cart.slice().reverse().map(it => {
                    const prod = products.find(p => String(p._id || p.id) === String(it.productId));
                    return (
                      <li key={String(it.productId)} className="cart-panel-item">
                        <div className="cart-thumb">
                          {(prod?.photo || prod?.photoUrl || localProductPhotos[prod?.id || prod?._id]) ? (
                            <img src={(() => {
                              const localPhoto = localProductPhotos[prod?.id || prod?._id];
                              if (localPhoto) return localPhoto;
                              const photoUrl = prod.photo || prod.photoUrl || '';
                              return photoUrl.startsWith('http') ? photoUrl : API(photoUrl);
                            })()} alt={it.name} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <div style={{display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', color:'#888', fontSize:'10px'}}>No Image</div>
                          )}
                        </div>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                            <div style={{flex:1, minWidth:0}}>
                              <strong style={{fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block'}}>{it.name}</strong>
                              <div style={{color:'#6b7280', fontSize:12}}>{prod?.hsnCode || ''}</div>
                            </div>
                            <div style={{textAlign:'right', minWidth:'80px'}}>
                              <div style={{fontWeight:700, fontSize:14}}>{formatCurrency0(it.price)}</div>
                              <div style={{color:'#6b7280', fontSize:12}}>{formatCurrency0(it.price * it.quantity)}</div>
                            </div>
                          </div>
                          <div style={{display:'flex', gap:8, alignItems:'center', marginTop:10}}>
                            <button className="qty-btn qty-dec" onClick={() => decreaseCartQty(it.productId)} title="Decrease quantity">-</button>
                            <input type="number" min={1} value={it.quantity} onChange={(e)=>setCartQty(it.productId, parseInt(e.target.value || '1'))} style={{width:60, padding:'6px 8px', border:'1px solid #e6e8f0', borderRadius:6, textAlign:'center', fontSize:13}} />
                            <button className="qty-btn qty-inc" onClick={() => increaseCartQty(it.productId)} title="Increase quantity">+</button>
                            <button className="qty-btn remove-btn" onClick={() => removeFromCart(it.productId)} style={{marginLeft:'auto'}} title="Remove from cart"><Icon name="trash" size={14}/></button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="cart-sidebar-footer">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>Subtotal</div>
                <div>{formatCurrency0(cartTotal)}</div>
              </div>
              {/* Loyalty feature removed */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>Discount ({discount}%)</div>
                <div>{formatCurrency0((cartTotal * (discount/100)) || 0)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>GST ({taxRate}%)</div>
                <div>{formatCurrency0(((cartTotal - (cartTotal * (discount/100))) * (taxRate/100)) || 0)}</div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, fontWeight:700}}>
                <div>Grand Total</div>
                {(() => {
                  const subtotal = cartTotal;
                  const discountAmount = subtotal * (discount / 100);
                  const afterDiscount = subtotal - discountAmount;
                  const tax = afterDiscount * (taxRate / 100);
                  const grand = Math.round(afterDiscount + tax);
                  return (<div>{formatCurrency0(grand)}</div>)
                })()}
              </div>
              <div style={{marginTop:12, display:'flex', gap:8}}>
                <button className="btn-primary" onClick={checkout} disabled={cart.length === 0}>Complete Sale</button>
                <button className="btn-secondary" onClick={() => { setCart([]); }}>Clear Cart</button>
                <button className="btn-primary" style={{background:'#25D366'}} onClick={()=> sendInvoiceWhatsApp({ id: lastBill?.id, billNumber: lastBill?.billNumber, items: cart, total: cartTotal })} disabled={cart.length===0}>WhatsApp</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );

}

