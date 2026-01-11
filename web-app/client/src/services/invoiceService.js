/**
 * Invoice Service
 * API calls for invoice/bill management
 */

import { API, apiGet, apiPost, apiDelete } from '../utils/api'

/**
 * Fetch all invoices
 */
export const fetchInvoices = async () => {
  return await apiGet('/api/invoices')
}

/**
 * Create checkout/invoice
 */
export const createCheckout = async (checkoutData) => {
  return await apiPost('/api/checkout', checkoutData)
}

/**
 * Get invoice by ID
 */
export const getInvoiceById = async (invoiceId) => {
  return await apiGet(`/api/invoices/${invoiceId}`)
}

/**
 * Delete invoice
 */
export const deleteInvoice = async (invoiceId) => {
  return await apiDelete(`/api/invoices/${invoiceId}`)
}

/**
 * Generate public invoice URL
 */
export const generatePublicInvoiceUrl = async (invoiceId, requestedBy, company) => {
  return await apiPost(`/api/invoices/${invoiceId}/public`, {
    requestedBy,
    company
  })
}

/**
 * Generate WhatsApp share link for invoice (server returns whatsappUrl and/or publicUrl)
 */
export const generateWhatsAppLink = async (invoiceId, requestedBy, company) => {
  return await apiPost(`/api/invoices/${invoiceId}/whatsapp-link`, {
    requestedBy,
    company
  })
} 

/**
 * Get invoice stats
 */
export const getInvoiceStats = async () => {
  return await apiGet('/api/stats')
}

/**
 * Filter invoices by date range
 */
export const filterInvoicesByDate = (invoices, filter, customStart, customEnd) => {
  if (filter === 'all') return invoices
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return invoices.filter(inv => {
    const invDate = new Date(inv.created_at)
    
    switch(filter) {
      case 'today':
        return invDate >= today
      
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return invDate >= weekAgo
      
      case 'month':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return invDate >= monthAgo
      
      case 'custom':
        if (!customStart && !customEnd) return true
        const start = customStart ? new Date(customStart) : new Date(0)
        const end = customEnd ? new Date(customEnd) : new Date()
        end.setHours(23, 59, 59, 999)
        return invDate >= start && invDate <= end
      
      default:
        return true
    }
  })
}
