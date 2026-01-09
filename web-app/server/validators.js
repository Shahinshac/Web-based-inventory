/**
 * Input Validation Module
 * Provides validation functions for API endpoints
 * Ensures data integrity and security
 */

// =============================================================================
// EMAIL VALIDATION
// =============================================================================

/**
 * Validate email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_PATTERN.test(email);
}

// =============================================================================
// PHONE VALIDATION
// =============================================================================

/**
 * Validate Indian mobile phone number format
 * Must be 10 digits starting with 6-9
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid or empty (optional field)
 */
function isValidPhone(phone) {
  if (!phone) return true; // Phone is optional
  
  const cleanedPhone = phone.replace(/[\s-]/g, '');
  const INDIAN_PHONE_PATTERN = /^[6-9]\d{9}$/;
  
  return INDIAN_PHONE_PATTERN.test(cleanedPhone);
}

// =============================================================================
// GSTIN VALIDATION
// =============================================================================

/**
 * Validate Indian GSTIN (Goods and Services Tax Identification Number) format
 * Format: 2 digits state code + 10 char PAN + 1 entity code + Z + 1 checksum
 * @param {string} gstin - GSTIN to validate
 * @returns {boolean} True if valid or empty (optional field)
 */
function isValidGSTIN(gstin) {
  if (!gstin) return true; // GSTIN is optional
  
  const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return GSTIN_PATTERN.test(gstin);
}

// =============================================================================
// PRODUCT VALIDATION
// =============================================================================

/**
 * Validate product data for creation or update
 * @param {Object} product - Product object to validate
 * @returns {string[]} Array of validation error messages
 */
function validateProduct(product) {
  const errors = [];
  
  // Name validation
  if (!product.name || product.name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters');
  }
  
  if (product.name && product.name.length > 200) {
    errors.push('Product name must be less than 200 characters');
  }
  
  // Price validation
  if (product.price !== undefined) {
    const price = Number(product.price);
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a non-negative number');
    }
  }
  
  // Cost price validation
  if (product.costPrice !== undefined) {
    const costPrice = Number(product.costPrice);
    if (isNaN(costPrice) || costPrice < 0) {
      errors.push('Cost price must be a non-negative number');
    }
  }
  
  // Quantity validation
  if (product.quantity !== undefined) {
    const quantity = Number(product.quantity);
    if (isNaN(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      errors.push('Quantity must be a non-negative integer');
    }
  }
  
  // Minimum stock validation
  if (product.minStock !== undefined) {
    const minStock = Number(product.minStock);
    if (isNaN(minStock) || minStock < 0 || !Number.isInteger(minStock)) {
      errors.push('Minimum stock must be a non-negative integer');
    }
  }
  
  // HSN code validation (4-8 digits)
  if (product.hsnCode && !/^\d{4,8}$/.test(product.hsnCode)) {
    errors.push('HSN code must be 4-8 digits');
  }
  
  // SKU validation
  if (product.sku && product.sku.length > 50) {
    errors.push('SKU must be less than 50 characters');
  }
  
  return errors;
}

// =============================================================================
// CUSTOMER VALIDATION
// =============================================================================

/**
 * Validate customer data for creation or update
 * @param {Object} customer - Customer object to validate
 * @returns {string[]} Array of validation error messages
 */
function validateCustomer(customer) {
  const errors = [];
  
  // Name validation
  if (!customer.name || customer.name.trim().length < 2) {
    errors.push('Customer name must be at least 2 characters');
  }
  
  if (customer.name && customer.name.length > 100) {
    errors.push('Customer name must be less than 100 characters');
  }
  
  // Phone validation
  if (customer.phone && !isValidPhone(customer.phone)) {
    errors.push('Invalid phone number format (must be 10 digits starting with 6-9)');
  }
  
  // Email validation
  if (customer.email && !isValidEmail(customer.email)) {
    errors.push('Invalid email format');
  }
  
  // GSTIN validation
  if (customer.gstin && !isValidGSTIN(customer.gstin)) {
    errors.push('Invalid GSTIN format');
  }
  
  // Address validation
  if (customer.address && customer.address.length > 500) {
    errors.push('Address must be less than 500 characters');
  }
  
  // Place validation
  if (customer.place && customer.place.length > 200) {
    errors.push('Place must be less than 200 characters');
  }
  
  // Pincode validation (6 digits for India)
  if (customer.pincode) {
    const pincodeStr = String(customer.pincode).trim();
    if (!/^\d{6}$/.test(pincodeStr)) {
      errors.push('Invalid pincode format (expected 6 digits for India)');
    }
  }
  
  return errors;
}

// =============================================================================
// USER REGISTRATION VALIDATION
// =============================================================================

/**
 * Validate user registration data
 * @param {Object} user - User registration object to validate
 * @returns {string[]} Array of validation error messages
 */
function validateUserRegistration(user) {
  const errors = [];
  
  // Username validation
  if (!user.username || user.username.trim().length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (user.username && user.username.length > 50) {
    errors.push('Username must be less than 50 characters');
  }
  
  if (user.username && !/^[a-zA-Z0-9_]+$/.test(user.username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  // Password validation
  if (!user.password || user.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (user.password && user.password.length > 100) {
    errors.push('Password must be less than 100 characters');
  }
  
  // Email validation (required)
  if (!user.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(user.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
}

// =============================================================================
// CHECKOUT VALIDATION
// =============================================================================

/**
 * Validate checkout/invoice data
 * @param {Object} data - Checkout data to validate
 * @returns {string[]} Array of validation error messages
 */
function validateCheckout(data) {
  const errors = [];
  
  // Items validation
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Cart must contain at least one item');
  }
  
  // Validate each item
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      const itemNum = index + 1;
      
      if (!item.productId) {
        errors.push(`Item ${itemNum}: Product ID is required`);
      }
      
      const quantity = Number(item.quantity);
      if (!item.quantity || quantity < 1 || !Number.isInteger(quantity)) {
        errors.push(`Item ${itemNum}: Valid quantity is required`);
      }
      
      if (item.price === undefined || item.price < 0) {
        errors.push(`Item ${itemNum}: Valid price is required`);
      }
    });
  }
  
  // Discount validation
  if (data.discount !== undefined) {
    const discount = Number(data.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      errors.push('Discount must be between 0 and 100');
    }
  }
  
  if (data.discountPercent !== undefined) {
    const discountPercent = Number(data.discountPercent);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      errors.push('Discount percent must be between 0 and 100');
    }
  }
  
  if (data.discountValue !== undefined) {
    const discountValue = Number(data.discountValue);
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      errors.push('Discount value must be between 0 and 100');
    }
  }
  
  // Tax rate validation
  if (data.taxRate !== undefined) {
    const taxRate = Number(data.taxRate);
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      errors.push('Tax rate must be between 0 and 100');
    }
  }
  
  // Total validation
  if (data.total !== undefined) {
    const total = Number(data.total);
    if (isNaN(total) || total < 0) {
      errors.push('Total must be a non-negative number');
    }
  }
  
  // Payment mode validation
  const VALID_PAYMENT_MODES = ['cash', 'upi', 'card', 'split', 'Cash', 'UPI', 'Card', 'Split'];
  if (data.paymentMode && !VALID_PAYMENT_MODES.includes(data.paymentMode)) {
    errors.push('Invalid payment mode. Must be: cash, upi, card, or split');
  }
  
  // Split payment validation
  const paymentModeLower = String(data.paymentMode || '').toLowerCase();
  if (paymentModeLower === 'split') {
    const cashAmount = parseFloat(data.cashAmount) || 0;
    const upiAmount = parseFloat(data.upiAmount) || 0;
    const cardAmount = parseFloat(data.cardAmount) || 0;
    const totalAmount = parseFloat(data.totalAmount) || parseFloat(data.total) || 0;
    
    // All amounts must be non-negative
    if (cashAmount < 0 || upiAmount < 0 || cardAmount < 0) {
      errors.push('Split payment amounts cannot be negative');
    }
    
    // At least one payment method required
    if (cashAmount === 0 && upiAmount === 0 && cardAmount === 0) {
      errors.push('At least one payment method must be used in split payment');
    }
    
    // Sum must match total (with tolerance)
    const sum = cashAmount + upiAmount + cardAmount;
    const TOLERANCE = 0.01;
    if (totalAmount > 0 && Math.abs(sum - totalAmount) > TOLERANCE) {
      errors.push(`Split payment sum (${sum.toFixed(2)}) must match total (${totalAmount.toFixed(2)})`);
    }
  }
  
  return errors;
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize a string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Recursively sanitize an object or array
 * @param {*} obj - Object, array, or primitive to sanitize
 * @returns {*} Sanitized value
 */
function sanitizeObject(obj) {
  // Handle primitives
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Handle objects
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  
  return sanitized;
}

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidGSTIN,
  validateProduct,
  validateCustomer,
  validateUserRegistration,
  validateCheckout,
  sanitizeString,
  sanitizeObject
};
