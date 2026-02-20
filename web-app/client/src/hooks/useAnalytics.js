import { useState, useEffect, useCallback } from 'react';
import { API, getAuthHeaders } from '../utils/api';

export function useAnalytics(isOnline, activeTab) {
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],
    lowStock: [],
    revenueSummary: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(30);

  const fetchAnalyticsData = useCallback(async (days = 30) => {
    try {
      setLoading(true);
      setError(null);
      
      const [topProductsRes, lowStockRes, revenueSummaryRes] = await Promise.all([
        fetch(API(`/api/analytics/top-products?days=${days}&limit=10`), { headers: getAuthHeaders() }),
        fetch(API('/api/analytics/low-stock'), { headers: getAuthHeaders() }),
        fetch(API(`/api/analytics/revenue-profit?days=${days}`), { headers: getAuthHeaders() })
      ]);
      
      const data = {
        topProducts: topProductsRes.ok ? await topProductsRes.json() : [],
        lowStock: lowStockRes.ok ? await lowStockRes.json() : [],
        revenueSummary: revenueSummaryRes.ok ? await revenueSummaryRes.json() : {}
      };
      
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopProducts = useCallback(async (days = 30, limit = 10) => {
    try {
      const res = await fetch(API(`/api/analytics/top-products?days=${days}&limit=${limit}`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        throw new Error('Failed to fetch top products');
      }
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  }, []);

  const fetchLowStock = useCallback(async () => {
    try {
      const res = await fetch(API('/api/analytics/low-stock'), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        throw new Error('Failed to fetch low stock products');
      }
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  }, []);

  const fetchRevenueSummary = useCallback(async (days = 30) => {
    try {
      const res = await fetch(API(`/api/analytics/revenue-profit?days=${days}`), { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { success: true, data };
      } else {
        throw new Error('Failed to fetch revenue summary');
      }
    } catch (err) {
      return { success: false, error: err.message, data: {} };
    }
  }, []);

  // Fetch when navigating to analytics tab or date range changes
  useEffect(() => {
    if (activeTab === 'analytics' && isOnline) {
      fetchAnalyticsData(dateRange);
    }
  }, [activeTab, dateRange, isOnline, fetchAnalyticsData]);

  return {
    analyticsData,
    loading,
    error,
    dateRange,
    setDateRange,
    fetchAnalyticsData,
    fetchTopProducts,
    fetchLowStock,
    fetchRevenueSummary
  };
}
