/**
 * Customer Service
 * API calls for customer management
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api'

/**
 * Fetch all customers
 */
export const fetchCustomers = async () => {
  return await apiGet('/api/customers')
}

/**
 * Add new customer
 */
export const addCustomer = async (customerData, userId, username) => {
  return await apiPost('/api/customers', {
    ...customerData,
    userId,
    username
  })
}

/**
 * Update customer
 */
export const updateCustomer = async (customerId, updates, userId, username) => {
  return await apiPatch(`/api/customers/${customerId}`, {
    ...updates,
    userId,
    username
  })
}

/**
 * Delete customer
 */
export const deleteCustomer = async (customerId, userId, username) => {
  return await apiDelete(`/api/customers/${customerId}?userId=${userId}&username=${username}`)
}

/**
 * Get customer by ID
 */
export const getCustomerById = async (customerId) => {
  return await apiGet(`/api/customers/${customerId}`)
}

/**
 * Get customer purchase history
 */
export const getCustomerHistory = async (customerId) => {
  return await apiGet(`/api/customers/${customerId}/history`)
}

/**
 * Search places (for address autocomplete)
 */
export const searchPlaces = async (query) => {
  try {
    const encodedQuery = encodeURIComponent(query + ', India')
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&limit=8&countrycodes=in`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'InventoryManagementApp/1.0'
      }
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    
    return data.map(result => ({
      display_name: result.display_name,
      place: result.address?.city || result.address?.town || result.address?.village || result.display_name.split(',')[0],
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      postcode: result.address?.postcode || '',
      full_address: result.display_name
    }))
  } catch (error) {
    console.error('Place search error:', error)
    return []
  }
}
