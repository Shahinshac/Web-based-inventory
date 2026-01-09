/**
 * Application-wide Constants
 * Contains configuration values, enums, formatters, and validators
 */

// =============================================================================
// GST CONFIGURATION
// =============================================================================

/** Fixed GST rate for all transactions */
export const DEFAULT_GST = 0.18;

/** GST percentage (18%) */
export const GST_PERCENT = 18;

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format number to exactly 1 decimal place
 * @param {number|string} n - Number to format
 * @returns {string} Formatted number with 1 decimal
 */
export const fmt1 = (n) => {
  return Number.isFinite(Number(n)) ? parseFloat(n).toFixed(1) : '0.0';
};

/**
 * Format number to integer (no decimals)
 * @param {number|string} n - Number to format
 * @returns {string} Formatted integer or empty string
 */
export const fmt0 = (n) => {
  if (n === null || typeof n === 'undefined' || n === '') {
    return '';
  }
  return String(Math.round(Number(n)));
};

/**
 * Format number as Indian Rupee currency with 1 decimal
 * @param {number|string} n - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (n) => `₹${fmt1(n)}`;

/**
 * Format number as Indian Rupee currency with no decimals
 * @param {number|string} n - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency0 = (n) => {
  if (n === null || typeof n === 'undefined' || n === '') {
    return '';
  }
  return `₹${fmt0(n)}`;
};

// =============================================================================
// PAYMENT MODES
// =============================================================================

/** Payment mode enum */
export const PAYMENT_MODES = {
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  SPLIT: 'split'
};

/** Display labels for payment modes */
export const PAYMENT_MODE_LABELS = {
  [PAYMENT_MODES.CASH]: 'Cash',
  [PAYMENT_MODES.UPI]: 'UPI',
  [PAYMENT_MODES.CARD]: 'Card',
  [PAYMENT_MODES.SPLIT]: 'Split Payment'
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate split payment amounts
 * @param {number|string} cashAmount - Cash payment amount
 * @param {number|string} upiAmount - UPI payment amount
 * @param {number|string} cardAmount - Card payment amount
 * @param {number|string} totalAmount - Total invoice amount
 * @returns {{valid: boolean, error?: string, cash?: number, upi?: number, card?: number}} Validation result
 */
export const validateSplitPayment = (cashAmount, upiAmount, cardAmount, totalAmount) => {
  const cash = parseFloat(cashAmount) || 0;
  const upi = parseFloat(upiAmount) || 0;
  const card = parseFloat(cardAmount) || 0;
  const total = parseFloat(totalAmount) || 0;
  
  // All values must be non-negative
  if (cash < 0 || upi < 0 || card < 0) {
    return {
      valid: false,
      error: 'Payment amounts cannot be negative'
    };
  }
  
  // At least one payment method required
  if (cash === 0 && upi === 0 && card === 0) {
    return {
      valid: false,
      error: 'At least one payment method must be used'
    };
  }
  
  // Sum must match total (with tolerance for rounding errors)
  const sum = cash + upi + card;
  const TOLERANCE = 0.01;
  
  if (Math.abs(sum - total) > TOLERANCE) {
    return {
      valid: false,
      error: `Payment total (₹${fmt1(sum)}) must match grand total (₹${fmt1(total)})`
    };
  }
  
  return { valid: true, cash, upi, card };
};
