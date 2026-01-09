/**
 * Frontend validation functions
 */

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (Indian format)
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

/**
 * Validate GSTIN format
 */
export const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

/**
 * Validate username
 */
export const validateUsername = (username) => {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }
  return { valid: true }
}

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}

/**
 * Validate split payment
 */
export const validateSplitPayment = (cashAmount, upiAmount, cardAmount, totalAmount) => {
  const cash = parseFloat(cashAmount) || 0
  const upi = parseFloat(upiAmount) || 0
  const card = parseFloat(cardAmount) || 0
  const totalPaid = cash + upi + card
  const difference = Math.abs(totalPaid - totalAmount)

  if (difference > 0.01) { // Allow 1 paisa tolerance
    return {
      valid: false,
      error: difference > 0 
        ? `Short by ₹${difference.toFixed(2)}` 
        : `Excess by ₹${Math.abs(difference).toFixed(2)}`
    }
  }

  return { valid: true }
}

/**
 * Validate product data
 */
export const validateProduct = (product) => {
  if (!product.name || product.name.trim() === '') {
    return { valid: false, error: 'Product name is required' }
  }
  if (product.price === undefined || product.price < 0) {
    return { valid: false, error: 'Valid price is required' }
  }
  if (product.quantity === undefined || product.quantity < 0) {
    return { valid: false, error: 'Valid quantity is required' }
  }
  return { valid: true }
}

/**
 * Validate customer data
 */
export const validateCustomer = (customer) => {
  if (!customer.name || customer.name.trim() === '') {
    return { valid: false, error: 'Customer name is required' }
  }
  if (!customer.phone || customer.phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' }
  }
  if (!validatePhone(customer.phone)) {
    return { valid: false, error: 'Invalid phone number format' }
  }
  if (customer.gstin && !validateGSTIN(customer.gstin)) {
    return { valid: false, error: 'Invalid GSTIN format' }
  }
  return { valid: true }
}

/**
 * Validate cart before checkout
 */
export const validateCart = (cart) => {
  if (!cart || cart.length === 0) {
    return { valid: false, error: 'Cart is empty' }
  }
  
  for (const item of cart) {
    if (!item.productId || !item.price || !item.quantity) {
      return { valid: false, error: 'Invalid cart items detected' }
    }
  }
  
  return { valid: true }
}
