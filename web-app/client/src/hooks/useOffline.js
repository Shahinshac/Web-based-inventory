/**
 * Offline Hook
 * Manages offline/online status and data synchronization
 */

import { useState, useEffect } from 'react'

export const useOffline = (isAuthenticated) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineTransactions, setOfflineTransactions] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastDataRefresh, setLastDataRefresh] = useState(null)

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      
      // Check for offline transactions
      if (window.offlineStorage) {
        const transactions = await window.offlineStorage.getOfflineTransactions()
        if (transactions && transactions.length > 0) {
          // Trigger sync
          syncOfflineData()
        }
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
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
    offlineTransactions,
    isSyncing,
    lastDataRefresh,
    syncOfflineData,
    loadOfflineTransactions,
    loadCachedData,
    saveOfflineTransaction
  }
}
