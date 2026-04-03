import { useState, useEffect, useCallback } from 'react';
import { API, getAuthHeaders } from '../utils/api';
import { useAutoRefresh, useVisibilityRefresh } from './useAutoRefresh';

export function useCustomers(isOnline, isAuthenticated, activeTab) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isOnline) {
        const res = await fetch(API('/api/customers'), { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setCustomers(data);
          
          // Cache fresh data
          if (window.offlineStorage) {
            await window.offlineStorage.cacheCustomers(data);
          }
        } else {
          throw new Error('Failed to fetch customers');
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cached = await window.offlineStorage.getCachedCustomers();
          if (cached.length > 0) {
            setCustomers(cached);
          }
        }
      }
    } catch (err) {
      setError(err.message);
      // Fallback to cached data on error
      if (window.offlineStorage) {
        const cached = await window.offlineStorage.getCachedCustomers();
        if (cached.length > 0) {
          setCustomers(cached);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  const addCustomer = useCallback(async (customerData) => {
    try {
      const res = await fetch(API('/api/customers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(customerData)
      });
      
      if (res.ok) {
        const newCustomer = await res.json();
        setCustomers(prev => [...prev, newCustomer]);
        await fetchCustomers(); // Refresh list
        return { success: true, customer: newCustomer };
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add customer');
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchCustomers]);

  const updateCustomer = useCallback(async (id, customerData) => {
    try {
      const res = await fetch(API(`/api/customers/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(customerData)
      });
      
      if (res.ok) {
        await fetchCustomers(); // Refresh list
        return { success: true };
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update customer');
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [fetchCustomers]);

  const deleteCustomer = useCallback(async (id) => {
    try {
      const res = await fetch(API(`/api/customers/${id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (res.ok) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        return { success: true };
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete customer');
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const getCustomerPurchases = useCallback(async (customerId) => {
    const startTime = Date.now();
    try {
      // Validate customer ID
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const url = API(`/api/customers/${customerId}/purchases`);
      const headers = getAuthHeaders();

      console.log(`[useCustomers] 📤 Starting fetch for customer: ${customerId}`);
      console.log(`[useCustomers] 🔗 URL: ${url}`);
      console.log(`[useCustomers] 🔐 Auth headers present: ${Object.keys(headers).length > 0 ? 'YES' : 'NO (⚠️  MISSING TOKEN)'}`);

      const res = await fetch(url, {
        headers: headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const elapsedMs = Date.now() - startTime;
      console.log(`[useCustomers] ⏱️  Response received in ${elapsedMs}ms (Status: ${res.status})`);
      console.log(`[useCustomers] 📊 Response headers:`, {
        contentType: res.headers.get('content-type'),
        contentLength: res.headers.get('content-length'),
        cacheControl: res.headers.get('cache-control')
      });

      if (!res.ok) {
        let errorMessage = `Failed to fetch customer purchases (HTTP ${res.status})`;
        let errorData = null;

        try {
          const textResponse = await res.text();
          console.error(`[useCustomers] 📨 Raw error response (${textResponse.length} bytes):`, textResponse);

          // Try to parse as JSON
          if (textResponse) {
            try {
              errorData = JSON.parse(textResponse);
              console.error(`[useCustomers] 📋 Parsed error JSON:`, errorData);

              if (errorData.error) {
                errorMessage = errorData.error;
              } else if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch (jsonErr) {
              console.warn(`[useCustomers] ⚠️  Could not parse response as JSON:`, jsonErr.message);
            }
          }
        } catch (readErr) {
          console.error(`[useCustomers] ❌ Error reading response body:`, readErr.message);
        }

        console.error(`[useCustomers] 🚫 API Error Status ${res.status}: ${errorMessage}`);
        console.error(`[useCustomers] Full error context:`, {
          url,
          status: res.status,
          statusText: res.statusText,
          errorData,
          customerId
        });

        throw new Error(errorMessage);
      }

      const data = await res.json();
      console.log(`[useCustomers] ✅ Successfully fetched purchases in ${elapsedMs}ms`, {
        customerId,
        billCount: data.bills?.length || 0,
        warrantyCount: data.warranties?.length || 0,
        stats: data.stats
      });

      return { success: true, purchases: data };
    } catch (err) {
      const elapsedMs = Date.now() - startTime;
      const errorMsg = err.message || 'Failed to fetch customer purchases';

      // Categorize error for better diagnostics
      let errorCategory = 'UNKNOWN';
      if (err.name === 'AbortError') {
        errorCategory = 'TIMEOUT (10s exceeded)';
      } else if (err.message.includes('Failed to fetch')) {
        errorCategory = 'NETWORK_ERROR (CORS, DNS, or network issue)';
      } else if (err.message.includes('Customer ID')) {
        errorCategory = 'VALIDATION_ERROR';
      }

      console.error(`[useCustomers] ❌ Final catch after ${elapsedMs}ms - ${errorCategory}:`, {
        error: errorMsg,
        customerId,
        errorName: err.name,
        fullError: err
      });

      return { success: false, error: errorMsg, purchases: [] };
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'customers') {
        fetchCustomers();
      } else {
        // Initial fetch or fetch on other tabs if data is empty
        if (customers.length === 0) {
          fetchCustomers();
        }
      }
    }
  }, [isAuthenticated, fetchCustomers, activeTab]);

  // Auto-refresh every 30 seconds
  const { refresh: manualRefresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
    fetchCustomers,
    30000,
    isOnline && isAuthenticated
  );

  // Refresh when tab becomes visible
  useVisibilityRefresh(fetchCustomers);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerPurchases,
    // Auto-refresh additions
    manualRefresh,
    isRefreshing,
    lastRefreshTime
  };
}
