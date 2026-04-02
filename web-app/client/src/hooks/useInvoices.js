import { useState, useEffect, useCallback } from 'react';
import { API, getAuthHeaders } from '../utils/api';
import { useAutoRefresh, useVisibilityRefresh } from './useAutoRefresh';

/**
 * Normalize invoice data from the API's flat structure into the nested
 * structure that the UI components expect.
 */
const normalizeInvoice = (inv) => {
  // Build nested customer object from flat fields
  const customer = (inv.customerName && inv.customerName !== 'Walk-in Customer')
    ? {
        name: inv.customerName,
        phone: inv.customerPhone || '',
        address: inv.customerAddress || '',
        place: inv.customerPlace || '',
        gstin: inv.customerGstin || ''
      }
    : null;

  // Normalize splitPaymentDetails keys (backend sends cashAmount/upiAmount/cardAmount)
  let splitPaymentDetails = inv.splitPaymentDetails || null;
  if (splitPaymentDetails) {
    splitPaymentDetails = {
      cash: splitPaymentDetails.cash ?? splitPaymentDetails.cashAmount ?? 0,
      upi: splitPaymentDetails.upi ?? splitPaymentDetails.upiAmount ?? 0,
      card: splitPaymentDetails.card ?? splitPaymentDetails.cardAmount ?? 0,
    };
  }

  return {
    ...inv,
    customer,
    splitPaymentDetails,
    // Ensure createdAt is always set (components use it for dates)
    createdAt: inv.createdAt || inv.date || inv.billDate,
    // Keep flat fields too for handlers that use them directly
    customerPhone: inv.customerPhone || customer?.phone || '',
    customerName: inv.customerName || customer?.name || 'Walk-in Customer',
    // Map subtotal / total correctly
    subtotal: inv.subtotal ?? inv.total ?? 0,
    total: inv.total ?? inv.grandTotal ?? 0,
    grandTotal: inv.grandTotal ?? inv.total ?? 0,
    afterDiscount: inv.afterDiscount ?? 0,
    gstAmount: inv.gstAmount ?? inv.taxAmount ?? 0,
    discountAmount: inv.discountAmount ?? 0,
    // Map financial fields (critical for Reports)
    totalCost: inv.totalCost ?? 0,
    totalProfit: inv.totalProfit ?? inv.profit ?? 0,
    profit: inv.totalProfit ?? inv.profit ?? 0,
  };
};

const normalizeInvoices = (data) => data.map(normalizeInvoice);

export function useInvoices(isOnline, isAuthenticated, activeTab) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInvoices = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (isOnline) {
        const res = await fetch(API('/api/invoices'), { headers: getAuthHeaders() });
        if (res.ok) {
          const rawData = await res.json();
          const data = normalizeInvoices(rawData);
          
          // Only update visible invoice list when appropriate
          if (force || activeTab !== 'invoices') {
            // Merge strategy to avoid jarring UI updates
            if (force && activeTab === 'invoices') {
              setInvoices(prev => {
                try {
                  const prevMap = new Map(prev.map(i => [i.id, i]));
                  const dataMap = new Map(data.map(i => [i.id, i]));
                  const mergedExisting = prev.map(p => dataMap.has(p.id) ? dataMap.get(p.id) : p);
                  const newItems = data.filter(d => !prevMap.has(d.id));
                  return [...newItems, ...mergedExisting];
                } catch (e) {
                  return data;
                }
              });
            } else {
              setInvoices(data);
            }
          }
          
          // Cache fresh data
          if (window.offlineStorage) {
            await window.offlineStorage.cacheBills(data);
          }
        } else {
          throw new Error('Failed to fetch invoices');
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cached = await window.offlineStorage.getCachedBills();
          if (cached.length > 0) {
            if (activeTab !== 'invoices' || force) {
              setInvoices(cached);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
      // Fallback to cached data on error
      if (window.offlineStorage) {
        const cached = await window.offlineStorage.getCachedBills();
        if (cached.length > 0) {
          setInvoices(cached);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, activeTab]);

  const createInvoice = useCallback(async (invoiceData) => {
    try {
      const res = await fetch(API('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...invoiceData, clientTime: new Date().toISOString() })
      });
      
      if (res.ok) {
        const newInvoice = await res.json();
        setInvoices(prev => [newInvoice, ...prev]);
        await fetchInvoices(true); // Force refresh
        return { success: true, invoice: newInvoice };
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create invoice');
      }
    } catch (err) {
      // Save offline if no connection
      if (!isOnline && window.offlineStorage) {
        try {
          await window.offlineStorage.saveOfflineTransaction({
            data: invoiceData,
            timestamp: Date.now()
          });
          return { success: true, offline: true };
        } catch (offlineErr) {
          return { success: false, error: 'Failed to save offline transaction' };
        }
      }
      return { success: false, error: err.message };
    }
  }, [isOnline, fetchInvoices]);

  const deleteInvoice = useCallback(async (id) => {
    try {
      const res = await fetch(API(`/api/invoices/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        return { success: true };
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete invoice');
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const filterInvoices = useCallback((filter, startDate, endDate) => {
    let filtered = [...invoices];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.createdAt || inv.date);
          return invDate >= today;
        });
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.createdAt || inv.date);
          return invDate >= weekAgo;
        });
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(inv => {
          const invDate = new Date(inv.createdAt || inv.date);
          return invDate >= monthAgo;
        });
        break;
      case 'custom':
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter(inv => {
            const invDate = new Date(inv.createdAt || inv.date);
            return invDate >= start && invDate <= end;
          });
        }
        break;
      default:
        // 'all' - no filter
        break;
    }
    
    return filtered;
  }, [invoices]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices(true);
    }
  }, [isAuthenticated, fetchInvoices]);

  // Auto-refresh every 30 seconds
  const { refresh: manualRefresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
    () => fetchInvoices(true),
    30000,
    isOnline && isAuthenticated
  );

  // Refresh when tab becomes visible
  useVisibilityRefresh(() => fetchInvoices(true));

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    createInvoice,
    deleteInvoice,
    filterInvoices,
    // Auto-refresh additions
    manualRefresh,
    isRefreshing,
    lastRefreshTime
  };
}
