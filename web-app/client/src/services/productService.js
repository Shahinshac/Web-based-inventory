/**
 * Product Service
 * API calls for product management
 */

import { API, apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload } from '../utils/api'

/**
 * Fetch all products
 */
export const fetchProducts = async () => {
  return await apiGet('/api/products')
}

/**
 * Search product by barcode
 */
export const searchProductByBarcode = async (barcode) => {
  return await apiGet(`/api/products/barcode/${encodeURIComponent(barcode)}`)
}

/**
 * Add new product
 */
export const addProduct = async (productData, userId, username) => {
  return await apiPost('/api/products', {
    ...productData,
    userId,
    username
  })
}

/**
 * Update product (full update - preserves photos)
 * Uses PUT to update all product fields except photos
 */
export const updateProduct = async (productId, updates, userId, username) => {
  return await apiPut(`/api/products/${productId}`, {
    ...updates,
    userId,
    username
  })
}

/**
 * Update product stock
 */
export const updateProductStock = async (productId, quantity, userId, username) => {
  return await apiPatch(`/api/products/${productId}`, {
    quantity,
    userId,
    username
  })
}

/**
 * Delete product
 */
export const deleteProduct = async (productId, userId, username) => {
  return await apiDelete(`/api/products/${productId}?userId=${userId}&username=${username}`)
}

/**
 * Upload a product photo (stored on Cloudinary via the backend).
 * Returns { success, photo: { id, url, storage } }
 */
export const uploadProductPhoto = async (productId, file, userId, username) => {
  const formData = new FormData()
  formData.append('photo', file)
  if (userId)   formData.append('userId',   userId)
  if (username) formData.append('username', username)

  return await apiUpload(`/api/products/${productId}/photo`, formData)
}

/**
 * Delete a specific product photo by its Cloudinary public_id / photo entry id.
 * Requires confirmed=true query flag (server-side safety check).
 */
export const deleteProductPhoto = async (productId, photoId, userId, username) => {
  const params = new URLSearchParams({
    confirmed: 'true',
    ...(userId   && { userId }),
    ...(username && { username })
  })
  return await apiDelete(`/api/products/${productId}/photo/${encodeURIComponent(photoId)}?${params}`)
}

/**
 * Delete the legacy single-photo field on a product.
 */
export const deleteProductLegacyPhoto = async (productId, userId, username) => {
  return await apiDelete(`/api/products/${productId}/photo?userId=${userId}&username=${username}`)
}

/**
 * Generate product barcode
 */
export const generateBarcode = async (productId, format = 'image') => {
  return await apiGet(`/api/products/${productId}/barcode?format=${format}`)
}

/**
 * Get product by ID
 */
export const getProductById = async (productId) => {
  return await apiGet(`/api/products/${productId}`)
}
