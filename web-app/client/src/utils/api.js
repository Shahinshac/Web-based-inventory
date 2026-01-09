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
  const fullUrl = baseUrl + path
  console.log('🔗 API Request:', fullUrl)
  return fullUrl
}

/**
 * Normalize photo URLs to use the client's API base URL
 * This handles cases where the server stores photos with different domains
 */
export const normalizePhotoUrl = (photoUrl) => {
  if (!photoUrl) return null
  
  // If it's already a relative path, prepend API base
  if (photoUrl.startsWith('/api/')) {
    return getApiBaseUrl() + photoUrl
  }
  
  // Extract the /api/... path from absolute URLs
  const apiPathMatch = photoUrl.match(/\/api\/(products|users)\/[^/]+\/photo/)
  if (apiPathMatch) {
    return getApiBaseUrl() + apiPathMatch[0]
  }
  
  // Return as-is if it's already a valid URL (e.g., external URLs)
  return photoUrl
}

/**
 * Generic fetch wrapper with error handling
 */
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(API(endpoint), {
      headers: {
        'Content-Type': 'application/json',
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
 * DELETE request
 */
export const apiDelete = (endpoint) => apiFetch(endpoint, { method: 'DELETE' })

/**
 * Upload file (multipart/form-data)
 */
export const apiUpload = async (endpoint, formData) => {
  try {
    const response = await fetch(API(endpoint), {
      method: 'POST',
      body: formData // Don't set Content-Type for FormData
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
