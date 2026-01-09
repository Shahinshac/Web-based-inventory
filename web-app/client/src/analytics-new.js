/**
 * Analytics Tracking Module
 * Integrates with Google Analytics and Vercel Analytics
 * Tracks page views, events, and user interactions
 */

// =============================================================================
// PAGE VIEW TRACKING
// =============================================================================

/**
 * Track page view with Google Analytics
 * @param {string} page - Page name or path
 */
export const trackPageView = (page) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_title: page,
      page_location: window.location.href
    });
  }
};

// =============================================================================
// EVENT TRACKING
// =============================================================================

/**
 * Track custom event with Google Analytics
 * @param {string} action - Event action (e.g., 'button_click', 'form_submit')
 * @param {string} category - Event category (e.g., 'engagement', 'conversion')
 * @param {string} label - Event label for additional context
 * @param {number} value - Optional numeric value
 */
export const trackEvent = (action, category = 'engagement', label = '', value = 0) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};

// =============================================================================
// USER INTERACTION TRACKING
// =============================================================================

/**
 * Track user interaction with specific UI elements
 * Sends to both Google Analytics and Vercel Analytics
 * @param {string} element - Element identifier (e.g., 'checkout_button', 'search_bar')
 * @param {string} action - Action performed (e.g., 'click', 'submit', 'change')
 */
export const trackUserInteraction = (element, action) => {
  // Track with Google Analytics
  trackEvent(action, 'user_interaction', element);
  
  // Track with Vercel Analytics if available
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', action, { element });
  }
};

// =============================================================================
// PERFORMANCE TRACKING
// =============================================================================

/**
 * Track page load performance metrics
 * @private
 */
function trackPerformance() {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      trackEvent('page_load_time', 'performance', 'load_complete', Math.round(loadTime));
    });
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize analytics tracking
 * Sets up page view tracking and performance monitoring
 */
export const initAnalytics = () => {
  // Track initial page load
  trackPageView('Home');
  
  // Setup performance tracking
  trackPerformance();
};
