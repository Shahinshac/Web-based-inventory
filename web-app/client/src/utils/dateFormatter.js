/**
 * Timestamp Formatting Utility for React Frontend
 * Converts backend UTC timestamps to IST (Asia/Kolkata) display format
 *
 * IMPORTANT: All times are displayed as exact datetime, NEVER as relative time ("2h ago" format)
 * Format: "02 Apr 2026, 08:15 PM"
 */

/**
 * Convert UTC timestamp to IST and format as "DD MMM YYYY, hh:mm AM/PM"
 * This is the MAIN function to use for all timestamp display
 *
 * @param {string|number|Date} timestamp - UTC timestamp (ISO string, milliseconds, or Date object)
 * @returns {string} Formatted datetime in IST, or "N/A" if invalid
 *
 * @example
 * formatTimestampIST("2026-04-02T15:30:45.123456+00:00")
 * // Returns: "02 Apr 2026, 08:15 PM"
 */
export const formatTimestampIST = (timestamp) => {
  if (!timestamp) return 'N/A';

  try {
    const date = new Date(timestamp);

    // Validate date
    if (isNaN(date.getTime())) return 'Invalid date';

    // Format as IST with specific options
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
};

/**
 * Format as date only (no time) in IST: "02 Apr 2026"
 *
 * @param {string|number|Date} timestamp - UTC timestamp
 * @returns {string} Formatted date in IST
 */
export const formatDateOnlyIST = (timestamp) => {
  if (!timestamp) return 'N/A';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Format as time only (no date) in IST: "08:15:30 PM"
 *
 * @param {string|number|Date} timestamp - UTC timestamp
 * @returns {string} Formatted time in IST
 */
export const formatTimeOnlyIST = (timestamp) => {
  if (!timestamp) return 'N/A';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid time';
  }
};

/**
 * Format as human-readable: "Thursday, 02 April 2026 at 08:15 PM"
 * Used for detailed displays like invoice headers
 *
 * @param {string|number|Date} timestamp - UTC timestamp
 * @returns {string} Detailed formatted datetime
 */
export const formatTimestampDetailed = (timestamp) => {
  if (!timestamp) return 'N/A';

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';

    return date.toLocaleString('en-IN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    console.error('Error formatting detailed timestamp:', error);
    return 'Invalid date';
  }
};

/**
 * Check if timestamp is older than specified hours
 *
 * @param {string|number|Date} timestamp - UTC timestamp
 * @param {number} hoursAgo - Number of hours to check back
 * @returns {boolean} True if timestamp is older than specified hours
 */
export const isOlderThan = (timestamp, hoursAgo) => {
  if (!timestamp) return false;

  try {
    const date = new Date(timestamp);
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

    return date < cutoffTime;
  } catch {
    return false;
  }
};

/**
 * Get days difference between two timestamps
 *
 * @param {string|number|Date} startDate - Start timestamp
 * @param {string|number|Date} endDate - End timestamp (defaults to now)
 * @returns {number} Number of days difference
 */
export const getDaysDifference = (startDate, endDate = new Date()) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return 0;
  }
};

/**
 * Get countdown string for expiry dates (e.g., "5 days left", "Expired")
 *
 * @param {string|number|Date} expiryDate - Expiry timestamp in UTC
 * @returns {string} Countdown text
 */
export const getExpiryCountdown = (expiryDate) => {
  if (!expiryDate) return 'Never';

  try {
    const now = new Date();
    const expiry = new Date(expiryDate);

    if (isNaN(expiry.getTime())) return 'Invalid date';

    if (now > expiry) return 'Expired';

    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} left`;
    }

    return 'Expiring soon';
  } catch {
    return 'Invalid date';
  }
};

export default {
  formatTimestampIST,
  formatDateOnlyIST,
  formatTimeOnlyIST,
  formatTimestampDetailed,
  isOlderThan,
  getDaysDifference,
  getExpiryCountdown
};
