/**
 * Cart Hook
 * Manages shopping cart state and operations
 */

import { useState, useCallback } from 'react'
import { validateCart } from '../utils/validators'

export const useCart = (products = []) => {
  const [cart, setCart] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [splitPayment, setSplitPayment] = useState(false)
  const [cashAmount, setCashAmount] = useState('')
  const [upiAmount, setUpiAmount] = useState('')
  const [cardAmount, setCardAmount] = useState('')

  // Add item to cart
  const addToCart = useCallback((product) => {
    if (!product || !product.id) {
      return { success: false, error: 'Invalid product' }
    }

    // Check stock
    if (product.quantity <= 0) {
      return { success: false, error: `${product.name} is out of stock` }
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => String(item.productId) === String(product.id))
      
      if (existing) {
        // Check stock limit
        if (existing.quantity + 1 > product.quantity) {
          return prevCart // Don't add, return unchanged
        }
        
        return prevCart.map(item =>
          String(item.productId) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...prevCart, {
        productId: product.id,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice || 0,
        quantity: 1
      }]
    })

    return { success: true }
  }, [])

  // Remove item from cart
  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => String(item.productId) !== String(productId)))
  }, [])

  // Increase quantity
  const increaseQuantity = useCallback((productId) => {
    setCart(prevCart => prevCart.map(item => {
      if (String(item.productId) === String(productId)) {
        const product = products.find(p => String(p.id) === String(productId))
        
        if (product && item.quantity + 1 > product.quantity) {
          return item // Don't increase if exceeds stock
        }
        
        return { ...item, quantity: item.quantity + 1 }
      }
      return item
    }))
  }, [products])

  // Decrease quantity
  const decreaseQuantity = useCallback((productId) => {
    setCart(prevCart => prevCart.map(item =>
      String(item.productId) === String(productId)
        ? { ...item, quantity: Math.max(1, item.quantity - 1) }
        : item
    ))
  }, [])

  // Set specific quantity
  const setQuantity = useCallback((productId, quantity) => {
    const qty = Math.max(1, parseInt(quantity) || 1)
    
    setCart(prevCart => prevCart.map(item => {
      if (String(item.productId) === String(productId)) {
        const product = products.find(p => String(p.id) === String(productId))
        
        if (product && qty > product.quantity) {
          return { ...item, quantity: product.quantity }
        }
        
        return { ...item, quantity: qty }
      }
      return item
    }))
  }, [products])

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([])
    setSelectedCustomer(null)
    setDiscount(0)
    setPaymentMode('Cash')
    setSplitPayment(false)
    setCashAmount('')
    setUpiAmount('')
    setCardAmount('')
  }, [])

  // Calculate totals
  const cartTotal = cart.reduce((sum, item) => 
    sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0
  )

  const cartCount = cart.reduce((sum, item) => 
    sum + (Number(item.quantity) || 0), 0
  )

  const subtotal = cartTotal
  const discountAmount = subtotal * (discount / 100)
  const afterDiscount = subtotal - discountAmount
  const taxAmount = afterDiscount * 0.18 // 18% GST
  const grandTotal = afterDiscount + taxAmount

  // Validate cart
  const isValid = () => {
    const validation = validateCart(cart)
    return validation.valid
  }

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
    cartTotal,
    cartCount,
    subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    grandTotal,
    isValid
  }
}
