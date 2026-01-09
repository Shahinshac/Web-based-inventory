/**
 * Utility Functions Module
 * Common helper functions used throughout the application
 */

/**
 * Format a number as Indian Rupee currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string with ₹ symbol
 */
function formatCurrency(amount) {
  const numericAmount = parseFloat(amount) || 0;
  return `₹${numericAmount.toFixed(2)}`;
}

module.exports = {
  formatCurrency
};
