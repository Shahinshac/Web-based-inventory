/**
 * Business calculation utilities
 * GST, discount, profit, and total calculations
 *
 * IMPORTANT: GST is NOT company revenue/profit
 * - Company Revenue = afterDiscount (price after discount, before GST)
 * - Grand Total = afterDiscount + GST (customer pays this, but GST goes to government)
 * - Profit = calculated before GST (GST is not profit)
 *
 * PROFIT CALCULATION NOTE:
 * - Profit uses COGS (Cost of Goods Sold), NOT total inventory cost.
 * - cost_per_item = costPrice (stored per product)
 * - cogs = cost_per_item × quantity_sold
 * - profit = revenue - cogs
 * - Operational expenses (rent, utilities, etc.) are tracked separately
 *   and NOT included in per-bill profit to avoid double-counting.
 *
 * GST CALCULATION NOTE:
 * - Each product has its own gstPercent (default 18%).
 * - Per-item GST is calculated on the taxable value (unit price × qty × discount factor).
 * - Total bill GST = sum of all per-item GST amounts.
 * - Same-state transactions: CGST (half) + SGST (half).
 * - Different-state transactions: IGST (full rate).
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
 * Calculate GST amount for a single line item after discount
 * @param {number} lineSubtotal - item subtotal (unit price × qty)
 * @param {number} discountFactor - e.g. 0.9 for 10% discount (1 - discountPercent/100)
 * @param {number} gstRate - GST rate as a decimal (e.g. 0.18 for 18%)
 */
export const calculateLineGst = (lineSubtotal, discountFactor = 1, gstRate = DEFAULT_GST) => {
  return lineSubtotal * discountFactor * gstRate
}

/**
 * Calculate total GST from cart items (supports per-item GST rates)
 * @param {Array} items - cart items, each with price, quantity, and optional gstPercent
 * @param {number} discountPercent - bill-level discount percentage
 */
export const calculateGST = (itemsOrAmount, gstRate = DEFAULT_GST, discountPercent = 0) => {
  // Legacy single-amount usage: calculateGST(amountAfterDiscount, rate)
  if (typeof itemsOrAmount === 'number') {
    return itemsOrAmount * gstRate
  }
  // Per-item usage: calculateGST(items, unused, discountPercent)
  const discountFactor = 1 - (discountPercent / 100)
  return itemsOrAmount.reduce((sum, item) => {
    const price = Number(item.price) || 0
    const quantity = Number(item.quantity) || 0
    const itemGstRate = (item.gstPercent !== undefined ? item.gstPercent : GST_PERCENT) / 100
    return sum + calculateLineGst(price * quantity, discountFactor, itemGstRate)
  }, 0)
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
 * Calculate profit per unit (uses COGS, not total inventory cost)
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
 * Calculate total profit from invoice items using COGS.
 * profit = (selling_price - cost_price) × quantity_sold
 * Does NOT include GST (GST is not company profit).
 */
export const calculateTotalProfit = (items) => {
  return items.reduce((sum, item) => {
    const profit = calculateProfit(item.price || item.unitPrice, item.costPrice || 0)
    const quantity = Number(item.quantity) || 0
    return sum + (profit * quantity)
  }, 0)
}

/**
 * Calculate full invoice breakdown including per-item GST support.
 * @param {Array} items - cart items with price, quantity, optional gstPercent and costPrice
 * @param {number} discountPercent - discount percentage (0-100)
 * @param {number} gstRate - fallback GST rate as decimal (used only when item has no gstPercent)
 */
export const calculateInvoiceBreakdown = (items, discountPercent = 0, gstRate = DEFAULT_GST) => {
  const subtotal = calculateSubtotal(items)
  const discountAmount = calculateDiscountAmount(subtotal, discountPercent)
  const afterDiscount = subtotal - discountAmount
  // Use per-item GST rates when available
  const gstAmount = calculateGST(items, gstRate, discountPercent)
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
