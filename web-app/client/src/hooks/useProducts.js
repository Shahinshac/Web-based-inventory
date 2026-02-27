/**
 * Products Hook
 * Manages products state and operations
 */

import { useState, useEffect } from 'react'
import {
  fetchProducts as fetchProductsAPI,
  addProduct as addProductAPI,
  updateProduct as updateProductAPI,
  updateProductStock as updateStockAPI,
  deleteProduct as deleteProductAPI,
  searchProductByBarcode,
  uploadProductPhoto as uploadProductPhotoAPI,
  deleteProductPhoto as deleteProductPhotoAPI
} from '../services/productService'

export const useProducts = (isOnline, isAuthenticated, currentUser, isAdmin) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (isOnline) {
        const data = await fetchProductsAPI()
        setProducts(data)
        
        // Cache for offline use
        if (window.offlineStorage) {
          await window.offlineStorage.cacheProducts(data)
        }
      } else {
        // Load from cache when offline
        if (window.offlineStorage) {
          const cached = await window.offlineStorage.getCachedProducts()
          if (cached.length > 0) {
            setProducts(cached)
          }
        }
      }
    } catch (err) {
      setError(err.message)
      
      // Fallback to cache on error
      if (window.offlineStorage) {
        const cached = await window.offlineStorage.getCachedProducts()
        if (cached.length > 0) {
          setProducts(cached)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Add product
  const addProduct = async (productData, userId = null, username = null) => {
    try {
      const result = await addProductAPI(productData, userId, username)
      await fetchProducts() // Refresh list
      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Update product
  const updateProduct = async (productId, updates) => {
    try {
      const userId = currentUser?.id || null
      const username = isAdmin ? 'admin' : currentUser?.username
      
      await updateProductAPI(productId, updates, userId, username)
      await fetchProducts()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Update stock
  const updateStock = async (productId, quantity) => {
    try {
      const userId = currentUser?.id || null
      const username = isAdmin ? 'admin' : currentUser?.username
      
      await updateStockAPI(productId, quantity, userId, username)
      await fetchProducts()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Delete product
  const deleteProduct = async (productId) => {
    try {
      const userId = currentUser?.id || null
      const username = isAdmin ? 'admin' : currentUser?.username
      
      await deleteProductAPI(productId, userId, username)
      await fetchProducts()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  // Search by barcode
  const searchByBarcode = async (barcode) => {
    try {
      const product = await searchProductByBarcode(barcode)
      return { success: true, product }
    } catch (err) {
      // Try local search as fallback
      const localProduct = products.find(p => 
        p.barcode === barcode || 
        p.name.toLowerCase().includes(barcode.toLowerCase())
      )
      
      if (localProduct) {
        return { success: true, product: localProduct }
      }
      
      return { success: false, error: 'Product not found' }
    }
  }

  /**
   * Upload a photo for a product.
   * Sends the file to the backend (Cloudinary) and refreshes the product list.
   * @param {string} productId
   * @param {File}   file
   * @returns {string} Cloudinary CDN URL of the uploaded photo
   */
  const uploadProductPhoto = async (productId, file) => {
    const userId   = currentUser?.id       || null
    const username = currentUser?.username || 'unknown'
    const result   = await uploadProductPhotoAPI(productId, file, userId, username)
    // Optimistically update local state so the card re-renders immediately
    setProducts(prev => prev.map(p => {
      if ((p.id || p._id) !== productId) return p
      const newPhoto = result?.photo || {}
      return {
        ...p,
        photo:  newPhoto.url || p.photo,
        photos: [...(p.photos || []), { id: newPhoto.id, url: newPhoto.url, storage: 'cloudinary', cloudinaryPublicId: newPhoto.id }]
      }
    }))
    return result?.photo?.url || null
  }

  /**
   * Delete a specific photo from a product.
   * @param {string} productId
   * @param {string} photoId   – Cloudinary public_id or photo entry id
   */
  const deleteProductPhoto = async (productId, photoId) => {
    const userId   = currentUser?.id       || null
    const username = currentUser?.username || 'unknown'
    await deleteProductPhotoAPI(productId, photoId, userId, username)
    // Optimistically remove from local state
    setProducts(prev => prev.map(p => {
      if ((p.id || p._id) !== productId) return p
      const updatedPhotos = (p.photos || []).filter(ph => ph.id !== photoId && ph.cloudinaryPublicId !== photoId)
      return {
        ...p,
        photos: updatedPhotos,
        photo:  updatedPhotos.length > 0 ? updatedPhotos[updatedPhotos.length - 1].url : null
      }
    }))
  }

  // Filter and sort products
  const getFilteredProducts = () => {
    let filtered = [...products]
    
    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      )
    }
    
    // Apply filter
    switch(productFilter) {
      case 'low-stock':
        filtered = filtered.filter(p => p.quantity > 0 && p.quantity < 10)
        break
      case 'out-of-stock':
        filtered = filtered.filter(p => p.quantity === 0)
        break
      case 'high-profit':
        filtered = filtered.filter(p => p.profitPercent >= 30)
        break
      default:
        break
    }
    
    // Apply sort
    switch(sortBy) {
      case 'stock':
        filtered.sort((a, b) => a.quantity - b.quantity)
        break
      case 'price':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'profit':
        filtered.sort((a, b) => b.profit - a.profit)
        break
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    
    return filtered
  }

  // Load products on mount
  useEffect(() => {
    fetchProducts()
  }, [isOnline])

  return {
    products,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    productFilter,
    setProductFilter,
    sortBy,
    setSortBy,
    fetchProducts,
    addProduct,
    updateProduct,
    updateStock,
    deleteProduct,
    uploadProductPhoto,
    deleteProductPhoto,
    searchByBarcode,
    getFilteredProducts
  }
}
