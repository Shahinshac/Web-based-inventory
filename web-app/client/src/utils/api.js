/**
 * API utility functions
 * Centralized API endpoint management and fetch wrappers
 */

// Get base API URL from environment
export const getApiBaseUrl = () => {
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
  // Remove trailing slash if present
  return baseUrl.replace(/\/$/, '')
}

export const API = (path) => {
  const baseUrl = getApiBaseUrl()
  return baseUrl + path
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
 * Generic fetch wrapper with error handling
 */
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('authToken')
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {}

    const response = await fetch(API(endpoint), {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error)
    throw error
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
 * Upload file (multipart/form-data) - includes auth header
 */
export const apiUpload = async (endpoint, formData, method = 'POST') => {
  try {
    const response = await fetch(API(endpoint), {
      method,
      headers: getAuthHeaders(), // Auth header only, NOT Content-Type (browser sets multipart boundary)
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }

    return await response.json()
  } catch (error) {
    console.error(`Upload error for ${endpoint}:`, error)
    throw error
  }
}
