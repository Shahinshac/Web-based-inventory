/**
 * API utility functions
 * Centralized API endpoint management and fetch wrappers
 */

// Get base API URL from environment
export const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // Intelligent resolution for local network testing (e.g. mobile phones)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // If we're on localhost, use localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // Production fallback for known hosted frontend domains.
    // This prevents customer-portal pages (Invoices/EMI) from failing when
    // VITE_API_URL is not set in Vercel.
    if (hostname.includes('vercel.app') || hostname === '26-07inventory.vercel.app') {
      return 'https://web-based-inventory.onrender.com';
    }

    // For any other hostname, VITE_API_URL should be set at build time.
    // Keep a sane fallback and log warning for quick diagnosis.
    console.warn(
      `[api] VITE_API_URL is not set. API calls may fail on host "${hostname}". ` +
      'Set VITE_API_URL to your backend URL (e.g. https://your-backend.onrender.com).'
    );

    return `http://${hostname}:5000`;
  }

  return 'http://localhost:5000';
}

export const API = (path) => {
  const baseUrl = getApiBaseUrl()
  return baseUrl + path
}

/**
 * Check if backend is healthy (handles Render sleep mode)
 * Returns true if backend is accessible, false otherwise
 */
export const checkBackendHealth = async (retries = 3, delayMs = 1000) => {
  const baseUrl = getApiBaseUrl();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[api] Health check attempt ${attempt}/${retries} to ${baseUrl}/health`);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      // Log response details for debugging
      console.log(`[api] Health check response: ${response.status} ${response.statusText}`);
      console.log(`[api] Response headers:`, {
        'content-type': response.headers.get('content-type'),
        'access-control-allow-origin': response.headers.get('access-control-allow-origin')
      });

      if (response.ok) {
        // Verify it's JSON with expected structure
        const data = await response.json();
        console.log(`[api] Backend health check PASSED on attempt ${attempt} ✅`, data);
        return true;
      } else {
        console.warn(`[api] Health check returned non-ok status: ${response.status}`);
      }
    } catch (error) {
      // Distinguish between CORS errors, network errors, and timeouts
      let errorType = 'Unknown error';
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        errorType = 'Network/CORS error';
      } else if (error.message.includes('AbortError') || error.message.includes('timeout')) {
        errorType = 'Timeout - Render backend is sleeping';
      }

      console.error(
        `[api] Health check attempt ${attempt}/${retries} FAILED`,
        {
          errorType,
          message: error.message,
          url: `${baseUrl}/health`
        }
      );

      // If not the last attempt, wait before retrying
      if (attempt < retries) {
        console.log(`[api] Retrying in ${delayMs * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  console.error('[api] ❌ Backend health check FAILED after all retries');
  return false;
}

/**
 * Fetch detailed backend diagnostics for debugging API issues
 * Returns comprehensive database and connection status information
 */
export const getBackendDiagnostics = async () => {
  const baseUrl = getApiBaseUrl();
  try {
    console.log(`[api] 🔍 Fetching detailed diagnostics from ${baseUrl}/health/details`);
    const response = await fetch(`${baseUrl}/health/details`, {
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();
    console.log(`[api] 📊 Backend diagnostics:`, data);

    // Provide helpful diagnostic summary
    if (data.database?.status === 'connected') {
      console.log(`[api] ✅ Database is connected`);
      const counts = data.database.collections;
      if (counts.customers?.count > 0) {
        console.log(`[api] 📋 Found ${counts.customers.count} customers`);
      }
      if (data.database.sample_customer) {
        console.log(`[api] 🔎 Sample customer SHAHINSHA:`, data.database.sample_customer);
      }
    } else {
      console.error(`[api] ❌ Database status: ${data.database?.status}`, data.database?.error);
    }

    return data;
  } catch (err) {
    console.error(`[api] ❌ Failed to fetch diagnostics:`, err.message);
    return {
      status: 'error',
      message: err.message,
      url: `${baseUrl}/health/details`
    };
  }
}

/**
 * Normalize photo URLs to a usable absolute URL.
 *
 * Priority:
 *   1. Cloudinary CDN URLs (res.cloudinary.com) — returned as-is (already absolute)
 *   2. Relative /api/ paths — prefixed with API base URL
 *   3. Absolute URLs containing /api/ — extract the /api/ path and prefix
 *   4. Any other absolute URL — returned as-is (external CDN, etc.)
 *   5. null / undefined — returns null
 */
export const normalizePhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;

  // ── Cloudinary CDN URL ── already fully qualified, serve directly
  if (photoUrl.includes('res.cloudinary.com') || photoUrl.includes('cloudinary.com')) {
    return photoUrl;
  }

  const baseUrl = getApiBaseUrl();

  // ── Relative /api/ path ──
  if (photoUrl.startsWith('/api/')) {
    return baseUrl + photoUrl;
  }

  // ── Already includes our base URL ──
  if (photoUrl.startsWith(baseUrl)) {
    return photoUrl;
  }

  // ── Absolute URL containing /api/ ── extract and rebuild
  if (photoUrl.includes('/api/')) {
    const pathStart = photoUrl.indexOf('/api/');
    // Preserve any query string (cache-buster, etc.)
    return baseUrl + photoUrl.substring(pathStart);
  }

  // ── Any other absolute URL ── pass through unchanged (e.g. external CDN)
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }

  return photoUrl;
};

/**
 * Retry fetch with exponential backoff for transient failures
 * (handles Render free tier sleep mode)
 */
const retryFetch = async (
  url,
  options = {},
  maxRetries = 3,
  initialDelayMs = 1000
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout per request
      });

      return response;
    } catch (error) {
      lastError = error;

      // Log the attempt
      const isNetworkError =
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('AbortError');

      if (isNetworkError && attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.warn(
          `[api] Request failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`,
          error.message
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        // Not a network error or last attempt
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Build a structured error object with status code and user-friendly message
 */
const createApiError = (status, body, endpoint) => {
  const error = new Error();
  error.status = status;
  error.endpoint = endpoint;
  error.isAuthError = false;
  error.isNetworkError = false;

  // Parse error details from response body
  let serverMessage = '';
  if (typeof body === 'object' && body.error) {
    serverMessage = body.error;
  } else if (typeof body === 'string') {
    serverMessage = body;
  }

  // Determine error type and user-friendly message
  switch (status) {
    case 401:
      error.isAuthError = true;
      error.message = 'Session expired or invalid. Please login again.';
      error.details = serverMessage || 'Authentication failed';
      break;

    case 403:
      error.message = 'You do not have permission to access this resource.';
      error.details = serverMessage || 'Access denied';
      break;

    case 404:
      error.message = `Resource not found (${endpoint})`;
      error.details = serverMessage || 'The requested resource does not exist';
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      error.message = 'Server error. Please try again later.';
      error.details = serverMessage || `HTTP ${status}`;
      break;

    default:
      error.message = serverMessage || `API error: ${status}`;
      error.details = `HTTP ${status}`;
  }

  return error;
};

/**
 * Generic fetch wrapper with error handling and retry logic
 */
export const apiFetch = async (endpoint, options = {}) => {
  const maxRetries = options.retries ?? 2; // Default 2 retries for transient errors
  const baseUrl = getApiBaseUrl();
  const token = localStorage.getItem('authToken');
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    console.log(`[api] ${options.method || 'GET'} ${baseUrl}${endpoint}`);
    console.log('[api] Token present:', !!token);

    const response = await retryFetch(
      API(endpoint),
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers
        },
        ...options
      },
      maxRetries
    );

    // Handle non-2xx HTTP responses
    if (!response.ok) {
      let responseBody = {};
      try {
        responseBody = await response.json();
      } catch (e) {
        // Response is not JSON, that's ok
      }

      const error = createApiError(response.status, responseBody, endpoint);
      console.error(`[api] ${error.message}`, error.details);
      throw error;
    }

    return await response.json();
  } catch (error) {
    // Handle network errors (not HTTP errors, but actual connection failures)
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      error.isNetworkError = true;
      error.message = `Unable to connect to server (${baseUrl}). The backend may be unreachable or waking up.`;
      console.error('[api] Network error:', error.message);
    } else if (error.message && error.message.includes('AbortError')) {
      error.isNetworkError = true;
      error.message = 'Request timeout. The server is taking too long to respond.';
      console.error('[api] Request timeout:', error.message);
    }

    console.error(`[api] Error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * GET request
 */
export const apiGet = (endpoint) => apiFetch(endpoint, { method: 'GET' })

/**
 * POST request
 */
export const apiPost = (endpoint, data) => apiFetch(endpoint, {
  method: 'POST',
  body: JSON.stringify(data)
})

/**
 * PATCH request
 */
export const apiPatch = (endpoint, data) => apiFetch(endpoint, {
  method: 'PATCH',
  body: JSON.stringify(data)
})

/**
 * PUT request
 */
export const apiPut = (endpoint, data) => apiFetch(endpoint, {
  method: 'PUT',
  body: JSON.stringify(data)
})

/**
 * DELETE request
 */
export const apiDelete = (endpoint) => apiFetch(endpoint, { method: 'DELETE' })

/**
 * Get auth headers for manual fetch calls
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

/**
 * Helper function: check if error is an authentication error (401)
 */
export const isAuthError = (error) => {
  return error && (error.isAuthError === true || error.status === 401);
}

/**
 * Helper function: check if error is a network/connection error
 */
export const isNetworkError = (error) => {
  return error && error.isNetworkError === true;
}

/**
 * Helper function: get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred.';
  return error.message || 'An unknown error occurred.';
}

/**
 * Helper function: get detailed error information (for logging)
 */
export const getErrorDetails = (error) => {
  if (!error) return null;
  return {
    message: error.message,
    details: error.details,
    status: error.status,
    isAuthError: error.isAuthError,
    isNetworkError: error.isNetworkError,
    endpoint: error.endpoint
  };
}

/**
 * Upload file (multipart/form-data) - includes auth header with retry logic
 */
export const apiUpload = async (endpoint, formData, method = 'POST') => {
  const maxRetries = 2;
  const baseUrl = getApiBaseUrl();

  try {
    const response = await retryFetch(
      API(endpoint),
      {
        method,
        headers: getAuthHeaders(), // Auth header only, NOT Content-Type
        body: formData
      },
      maxRetries
    );

    if (!response.ok) {
      let responseBody = {};
      try {
        responseBody = await response.json();
      } catch (e) {
        // Response is not JSON
      }

      const error = createApiError(response.status, responseBody, endpoint);
      console.error(`[api] Upload ${error.message}`, error.details);
      throw error;
    }

    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      error.isNetworkError = true;
      error.message = `Unable to upload file. Connection to server (${baseUrl}) failed.`;
      console.error('[api] Upload network error:', error.message);
    } else if (error.message && error.message.includes('AbortError')) {
      error.isNetworkError = true;
      error.message = 'Upload timeout. The server is taking too long to respond.';
      console.error('[api] Upload timeout:', error.message);
    }

    console.error(`Upload error for ${endpoint}:`, error);
    throw error;
  }
};
