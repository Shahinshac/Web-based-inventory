import { useState, useEffect, useCallback } from 'react';
import { API, getAuthHeaders } from '../utils/api';

export function useCustomers(isOnline, isAuthenticated) {
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
    try {
      const res = await fetch(API(`/api/customers/${customerId}/purchases`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { success: true, purchases: data };
      } else {
        throw new Error('Failed to fetch customer purchases');
      }
    } catch (err) {
      return { success: false, error: err.message, purchases: [] };
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [isAuthenticated, fetchCustomers]);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerPurchases
  };
}
