/**
 * Formatting utilities
 * Currency, date, and number formatters
 */

/**
 * Format currency with 1 decimal place
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0
  return `₹${amount.toFixed(1)}`
}

/**
 * Format currency with no decimal places
 */
export const formatCurrency0 = (amount) => {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0
  return `₹${Math.round(amount)}`
}

/**
 * Format currency - alias for formatCurrency
 */
export const fmt1 = formatCurrency

/**
 * Format currency - alias for formatCurrency0
 */
export const fmt0 = formatCurrency0

/**
 * Format date to Indian locale
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format date with time
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  })
}

/**
 * Format phone number for WhatsApp
 */
export const formatPhoneForWhatsApp = (phone, countryCode = '91') => {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  
  // If 10 digits, prepend country code
  if (digits.length === 10) {
    digits = countryCode + digits
  }
  
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

/**
 * Convert number to words (Indian system)
 */
export const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  
  if (num === 0) return 'Zero'
  
  function convertHundreds(n) {
    let str = ''
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + ' Hundred '
      n %= 100
    }
    if (n > 19) {
      str += tens[Math.floor(n / 10)] + ' '
      n %= 10
    } else if (n >= 10) {
      str += teens[n - 10] + ' '
      return str.trim()
    }
    str += ones[n] + ' '
    return str.trim()
  }
  
  if (num >= 10000000) {
    return convertHundreds(Math.floor(num / 10000000)) + ' Crore ' + numberToWords(num % 10000000)
  }
  if (num >= 100000) {
    return convertHundreds(Math.floor(num / 100000)) + ' Lakh ' + numberToWords(num % 100000)
  }
  if (num >= 1000) {
    return convertHundreds(Math.floor(num / 1000)) + ' Thousand ' + numberToWords(num % 1000)
  }
  return convertHundreds(num)
}

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
