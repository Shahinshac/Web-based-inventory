/**
 * Auto Refresh Hook
 * Provides automatic periodic data refresh functionality
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Hook for automatic data refresh at specified intervals
 * @param {Function} refreshFunction - The function to call for refreshing data
 * @param {number} interval - Refresh interval in milliseconds (default: 30000ms = 30s)
 * @param {boolean} enabled - Whether auto-refresh is enabled
 * @returns {Object} - Control functions and state
 */
export const useAutoRefresh = (refreshFunction, interval = 30000, enabled = true) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const intervalRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  // Manual refresh function with debounce
  const refresh = async (force = false) => {
    if (isRefreshing && !force) return;

    try {
      setIsRefreshing(true);
      await refreshFunction();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Auto-refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Setup auto-refresh interval
  useEffect(() => {
    if (!enabled || !refreshFunction) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [refreshFunction, interval, enabled]);

  return {
    refresh,
    isRefreshing,
    lastRefreshTime
  };
};

/**
 * Hook for visibility-based refresh (refresh when tab becomes visible)
 * @param {Function} refreshFunction - The function to call when tab becomes visible
 */
export const useVisibilityRefresh = (refreshFunction) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refreshFunction) {
        refreshFunction();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshFunction]);
};
