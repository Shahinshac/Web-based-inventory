/**
 * Business calculation utilities
 * GST, discount, profit, and total calculations
 */

// Constants
export const DEFAULT_GST = 0.18 // 18%
export const GST_PERCENT = 18

/**
 * Calculate subtotal from cart items
 */
export const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    return sum + (price * quantity)
  }, 0)
}

/**
 * Calculate discount amount
 */
export const calculateDiscountAmount = (subtotal, discountPercent) => {
  return subtotal * (discountPercent / 100)
}

/**
 * Calculate GST amount
 */
export const calculateGST = (amountAfterDiscount, gstRate = DEFAULT_GST) => {
  return amountAfterDiscount * gstRate
}

/**
 * Calculate grand total
 */
export const calculateGrandTotal = (subtotal, discountPercent = 0, gstRate = DEFAULT_GST) => {
  const discountAmount = calculateDiscountAmount(subtotal, discountPercent)
  const afterDiscount = subtotal - discountAmount
  const gstAmount = calculateGST(afterDiscount, gstRate)
  return afterDiscount + gstAmount
}

/**
 * Calculate profit per unit
 */
export const calculateProfit = (sellingPrice, costPrice) => {
  return Number(sellingPrice) - Number(costPrice)
}

/**
 * Calculate profit percentage
 */
export const calculateProfitPercent = (sellingPrice, costPrice) => {
  const profit = calculateProfit(sellingPrice, costPrice)
  if (costPrice === 0) return 0
  return ((profit / costPrice) * 100).toFixed(2)
}

/**
 * Calculate total profit from invoice items
 */
export const calculateTotalProfit = (items) => {
  return items.reduce((sum, item) => {
    const profit = calculateProfit(item.price || item.unitPrice, item.costPrice || 0)
    const quantity = Number(item.quantity) || 0
    return sum + (profit * quantity)
  }, 0)
}

/**
 * Calculate invoice breakdown
 */
export const calculateInvoiceBreakdown = (items, discountPercent = 0, gstRate = DEFAULT_GST) => {
  const subtotal = calculateSubtotal(items)
  const discountAmount = calculateDiscountAmount(subtotal, discountPercent)
  const afterDiscount = subtotal - discountAmount
  const gstAmount = calculateGST(afterDiscount, gstRate)
  const grandTotal = afterDiscount + gstAmount
  const totalProfit = calculateTotalProfit(items)

  return {
    subtotal,
    discountAmount,
    discountPercent,
    afterDiscount,
    gstAmount,
    gstRate: gstRate * 100, // Convert to percentage
    grandTotal,
    totalProfit
  }
}
