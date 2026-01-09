/**
 * Analytics Service
 * API calls for analytics and reports
 */

import { apiGet } from '../utils/api'

/**
 * Fetch top products
 */
export const fetchTopProducts = async (days = 30, limit = 10) => {
  return await apiGet(`/api/analytics/top-products?days=${days}&limit=${limit}`)
}

/**
 * Fetch low stock items
 */
export const fetchLowStock = async () => {
  return await apiGet('/api/analytics/low-stock')
}

/**
 * Fetch revenue and profit summary
 */
export const fetchRevenueSummary = async (days = 30) => {
  return await apiGet(`/api/analytics/revenue-profit?days=${days}`)
}

/**
 * Fetch complete analytics data
 */
export const fetchAnalyticsData = async (days = 30) => {
  try {
    const [topProducts, lowStock, revenueSummary] = await Promise.all([
      fetchTopProducts(days, 10),
      fetchLowStock(),
      fetchRevenueSummary(days)
    ])
    
    return {
      topProducts: topProducts || [],
      lowStock: lowStock || [],
      revenueSummary: revenueSummary || {}
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return {
      topProducts: [],
      lowStock: [],
      revenueSummary: {}
    }
  }
}

/**
 * Fetch expenses
 */
export const fetchExpenses = async () => {
  try {
    const response = await apiGet('/api/expenses')
    return response.expenses || []
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return []
  }
}

/**
 * Add expense
 */
export const addExpense = async (expenseData) => {
  return await apiGet('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData)
  })
}

/**
 * Delete expense
 */
export const deleteExpense = async (expenseId) => {
  return await apiGet(`/api/expenses/${expenseId}`, {
    method: 'DELETE'
  })
}
