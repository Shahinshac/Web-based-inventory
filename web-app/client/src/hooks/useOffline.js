/**
 * Offline Hook
 * Manages offline/online status and data synchronization
 */

import { useState, useEffect, useCallback } from 'react'

export const useOffline = (isAuthenticated) => {
  const [isOnline, setIsOnline] = useState(true) // Default to online
  const [connectionStatus, setConnectionStatus] = useState('checking') // 'checking', 'online', 'offline', 'waking'
  const [lastCheck, setLastCheck] = useState(Date.now())
  const [offlineTransactions, setOfflineTransactions] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastDataRefresh, setLastDataRefresh] = useState(null)

  const testConnection = useCallback(async () => {
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '') + '/health'
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const test = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (test.ok) {
        setIsOnline(true)
        setConnectionStatus('online')
      } else if (test.status === 503) {
        // Service worker returned offline or server is starting up
        setIsOnline(false)
        setConnectionStatus('offline')
      } else {
        setIsOnline(false)
        setConnectionStatus('offline')
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        setConnectionStatus('waking')
      } else {
        setIsOnline(false)
        setConnectionStatus('offline')
      }
    } finally {
      setLastCheck(Date.now())
    }
  }, [])

  // Handle online/offline events - More reliable detection
  useEffect(() => {
    // Test on mount
    testConnection()

    // Test every 10 seconds
    const interval = setInterval(testConnection, 10000)

    // Listen to native online/offline events
    const handleOnline = () => {
      setIsOnline(true)

      // Check for offline transactions
      if (window.offlineStorage) {
        window.offlineStorage.getOfflineTransactions().then(transactions => {
          if (transactions && transactions.length > 0) {
            syncOfflineData()
          }
        })
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load offline transactions
  const loadOfflineTransactions = async () => {
    if (!window.offlineStorage) return

    try {
      const transactions = await window.offlineStorage.getOfflineTransactions()
      setOfflineTransactions(transactions || [])
    } catch (error) {
      console.error('Error loading offline transactions:', error)
    }
  }

  // Sync offline data when online
  const syncOfflineData = async () => {
    if (!isOnline || !window.offlineStorage) return

    setIsSyncing(true)

    try {
      const transactions = await window.offlineStorage.getOfflineTransactions()

      if (!transactions || transactions.length === 0) {
        setIsSyncing(false)
        return { success: true, synced: 0 }
      }

      let synced = 0
      let failed = 0

      for (const transaction of transactions) {
        try {
          const response = await fetch('/api/bills', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${transaction.token}`
            },
            body: JSON.stringify(transaction.data)
          })

          if (response.ok) {
            await window.offlineStorage.removeOfflineTransaction(transaction.id)
            synced++
          } else {
            await window.offlineStorage.updateOfflineTransactionStatus(transaction.id, 'failed')
            failed++
          }
        } catch (error) {
          await window.offlineStorage.updateOfflineTransactionStatus(transaction.id, 'failed')
          failed++
        }
      }

      await loadOfflineTransactions()
      setIsSyncing(false)

      return { success: true, synced, failed }
    } catch (error) {
      console.error('Sync error:', error)
      setIsSyncing(false)
      return { success: false, error: error.message }
    }
  }

  // Load cached data
  const loadCachedData = async () => {
    if (!window.offlineStorage) return null

    try {
      const [products, customers, bills] = await Promise.all([
        window.offlineStorage.getCachedProducts(),
        window.offlineStorage.getCachedCustomers(),
        window.offlineStorage.getCachedBills()
      ])

      return { products, customers, bills }
    } catch (error) {
      console.error('Error loading cached data:', error)
      return null
    }
  }

  // Save transaction offline
  const saveOfflineTransaction = async (transactionData, token) => {
    if (!window.offlineStorage) return { success: false }

    try {
      await window.offlineStorage.saveOfflineTransaction(transactionData, token)
      await loadOfflineTransactions()
      return { success: true }
    } catch (error) {
      console.error('Error saving offline transaction:', error)
      return { success: false, error: error.message }
    }
  }

  // Load offline transactions on mount
  useEffect(() => {
    if (isAuthenticated && window.offlineStorage) {
      loadOfflineTransactions()
    }
  }, [isAuthenticated])

  // Refresh cached data periodically when offline
  useEffect(() => {
    if (!isOnline || !isAuthenticated) return

    const intervalId = setInterval(() => {
      setLastDataRefresh(new Date())
    }, 30000) // Every 30 seconds

    return () => clearInterval(intervalId)
  }, [isOnline, isAuthenticated])

  return {
    isOnline,
    connectionStatus,
    lastCheck,
    offlineTransactions,
    isSyncing,
    lastDataRefresh,
    syncOfflineData,
    loadOfflineTransactions,
    loadCachedData,
    testConnection,
    saveOfflineTransaction
  }
}
