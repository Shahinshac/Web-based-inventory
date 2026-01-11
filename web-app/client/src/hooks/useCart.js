/**
 * Cart Hook
 * Manages shopping cart state and operations
 */

import { useState, useCallback } from 'react'
import { validateCart } from '../utils/validators'
import { calculateSubtotal } from '../utils/calculations'

export const useCart = (products = []) => {
  // Cart state, errors map for inline validation messages
  const [cart, setCart] = useState([])
  const [errors, setErrors] = useState({}) // { [productId]: 'error message' }
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [splitPayment, setSplitPayment] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [upiAmount, setUpiAmount] = useState('')
  const [cardAmount, setCardAmount] = useState('')

  // Helper to set an error message for an item (inline errors shown in UI)
  const setItemError = useCallback((productId, message) => {
    setErrors(prev => ({ ...prev, [productId]: message }))
  }, [])

  const clearItemError = useCallback((productId) => {
    setErrors(prev => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }, [])

  const clearAllErrors = useCallback(() => setErrors({}), [])

  // Add item to cart with quantity (default 1)
  // Note: perform synchronous validation before mutating state so callers can react to the result
  const addToCart = useCallback((product, qty = 1) => {
    if (!product || !product.id) {
      return { success: false, error: 'Invalid product' }
    }

    const desiredQty = Math.max(1, parseInt(qty) || 1)

    // Check stock availability before mutating state
    if (product.quantity <= 0) {
      // Keep inline error so the UI can show this near the product / cart
      setItemError(product.id, `${product.name} is out of stock`)
      return { success: false, error: `${product.name} is out of stock` }
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => String(item.id) === String(product.id))
      const maxStock = product.quantity || 0

      if (existing) {
        const newQty = existing.quantity + desiredQty
        if (newQty > maxStock) {
          // Inline error: communicate the exact limit to the user
          setItemError(product.id, `Only ${maxStock} in stock`)
          return prevCart
        }

        // Clear previously set error if any and update quantity
        clearItemError(product.id)
        return prevCart.map(item =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: item.quantity + desiredQty }
            : item
        )
      }

      // Add new item with stock metadata so UI can render disables and limits
      clearItemError(product.id)
      return [...prevCart, {
        id: product.id,
        productId: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        costPrice: Number(product.costPrice) || 0,
        quantity: desiredQty,
        maxStock: maxStock
      }]
    })

    return { success: true }
  }, [clearItemError, setItemError])

  // Remove item from cart
  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => String(item.id) !== String(productId)))
    clearItemError(productId)
  }, [clearItemError])

  // Increase quantity by 1 (enforces stock)
  // Reason: keep UI responsive and show inline errors instead of silent fails or alerts
  const increaseQuantity = useCallback((productId) => {
    setCart(prevCart => prevCart.map(item => {
      if (String(item.id) === String(productId)) {
        const max = item.maxStock || (products.find(p => String(p.id) === String(productId))?.quantity || 0)
        if (item.quantity + 1 > max) {
          setItemError(productId, `Only ${max} in stock`)
          return item
        }
        clearItemError(productId)
        return { ...item, quantity: item.quantity + 1 }
      }
      return item
    }))
  }, [products, setItemError, clearItemError])

  // Decrease quantity by 1, remove item if quantity drops to 0
  // Reason: prevent ghost items with zero quantity; explicit removal keeps state clean
  const decreaseQuantity = useCallback((productId) => {
    setCart(prevCart => prevCart.reduce((acc, item) => {
      if (String(item.id) === String(productId)) {
        const newQty = item.quantity - 1
        if (newQty <= 0) {
          // Removing item
          clearItemError(productId)
          return acc
        }
        clearItemError(productId)
        acc.push({ ...item, quantity: newQty })
        return acc
      }
      acc.push(item)
      return acc
    }, []))
  }, [clearItemError])

  // Set specific quantity (0 removes the item). Enforces maxStock.
  // Reason: allow direct quantity edits while ensuring quantity is valid and within available stock
  const setQuantity = useCallback((productId, quantity) => {
    const qty = Math.max(0, parseInt(quantity) || 0)

    setCart(prevCart => prevCart.reduce((acc, item) => {
      if (String(item.id) === String(productId)) {
        const maxStock = item.maxStock || (products.find(p => String(p.id) === String(productId))?.quantity || 0)
        if (qty > maxStock) {
          setItemError(productId, `Only ${maxStock} in stock`)
          acc.push({ ...item, quantity: maxStock })
          return acc
        }
        if (qty <= 0) {
          // remove item
          clearItemError(productId)
          return acc
        }
        clearItemError(productId)
        acc.push({ ...item, quantity: qty })
        return acc
      }
      acc.push(item)
      return acc
    }, []))
  }, [products, setItemError, clearItemError])

  // Clear cart and reset related state and errors
  const clearCart = useCallback(() => {
    setCart([])
    clearAllErrors()
    setSelectedCustomer(null)
    setDiscount(0)
    setPaymentMode('Cash')
    setSplitPayment(false)
    setCashAmount('')
    setUpiAmount('')
    setCardAmount('')
  }, [clearAllErrors])

  // Calculate totals using centralized helpers to ensure consistency
  const subtotal = calculateSubtotal(cart)
  const cartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const discountAmount = subtotal * (discount / 100)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = afterDiscount * 0.18 // 18% GST (kept explicit here for clarity)
  const grandTotal = afterDiscount + taxAmount

  // Validate cart items before checkout: ensures no invalid items, quantities >0 and within stock
  const isValid = useCallback(() => {
    if (!cart || cart.length === 0) return false

    for (const item of cart) {
      if (!item || !item.id || !item.name) return false
      const product = products.find(p => String(p.id) === String(item.id))
      if (!product) return false
      const q = Number(item.quantity) || 0
      if (q <= 0) return false
      if (q > (product.quantity || 0)) return false
    }

    return true
  }, [cart, products])

  return {
    // State
    cart,
    selectedCustomer,
    discount,
    paymentMode,
    splitPayment,
    cashAmount,
    upiAmount,
    cardAmount,
    
    // Setters
    setCart,
    setSelectedCustomer,
    setDiscount,
    setPaymentMode,
    setSplitPayment,
    setCashAmount,
    setUpiAmount,
    setCardAmount,
    
    // Actions
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    setQuantity,
    clearCart,
    
    // Computed
    cartTotal: subtotal,
    cartCount,
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    grandTotal,
    errors,

    // Error helpers
    setItemError,
    clearItemError,
    clearAllErrors,

    isValid
  }
}
