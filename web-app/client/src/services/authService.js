/**
 * Authentication Service
 * Handles login, registration, and session management
 */

import { API, apiPost, apiGet, apiUpload, apiDelete } from '../utils/api'

/**
 * Login user
 */
export const loginUser = async (username, password) => {
  const response = await apiPost('/api/users/login', { username, password })
  
  if (response.user) {
    // Store JWT token
    if (response.token) {
      localStorage.setItem('authToken', response.token)
    }
    // Store user data
    const isAdmin = response.user.role === 'admin'
    localStorage.setItem('currentUser', JSON.stringify(response.user))
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false')
    localStorage.setItem('userRole', response.user.role || 'cashier')
  }
  
  return response
}

/**
 * Register new user
 */
export const registerUser = async (username, password, email) => {
  return await apiPost('/api/users/register', { username, password, email })
}

/**
 * Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem('currentUser')
  localStorage.removeItem('isAdmin')
  localStorage.removeItem('userRole')
  localStorage.removeItem('authToken')
}

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  try {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      return JSON.parse(storedUser)
    }
  } catch (error) {
    console.error('Error parsing current user:', error)
  }
  return null
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getCurrentUser()
}

/**
 * Check if user is admin
 */
export const isUserAdmin = () => {
  return localStorage.getItem('isAdmin') === 'true'
}

/**
 * Get user role
 */
export const getUserRole = () => {
  return localStorage.getItem('userRole') || 'cashier'
}

/**
 * Validate session with server
 */
export const validateSession = async () => {
  try {
    const token = localStorage.getItem('authToken')
    if (!token) return null
    const response = await apiGet('/api/users/session')
    return response
  } catch (error) {
    // Token invalid / expired
    logoutUser()
    return null
  }
}

/**
 * Check if user account still exists
 */
export const checkUserValidity = async (userId) => {
  try {
    const response = await apiGet(`/api/users/check/${userId}`)
    return response.exists && response.approved
  } catch (error) {
    console.error('User validity check error:', error)
    return false
  }
}
/**
 * Update user's photo in localStorage (optimistic local state)
 */
export const updateUserPhoto = (photoUrl) => {
  try {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      user.photo = photoUrl
      localStorage.setItem('currentUser', JSON.stringify(user))
    }
  } catch (error) {
    console.error('Error updating user photo:', error)
  }
}

/**
 * Upload a new profile photo for the given user ID.
 * Sends the file to the backend which uploads to Cloudinary.
 * Returns { success, photo: <Cloudinary CDN URL> }
 */
export const uploadUserProfilePhoto = async (userId, file) => {
  const formData = new FormData()
  formData.append('photo', file)
  return await apiUpload(`/api/users/${userId}/photo`, formData)
}

/**
 * Delete the profile photo for the given user ID.
 */
export const deleteUserProfilePhoto = async (userId) => {
  return await apiDelete(`/api/users/${userId}/photo`)
}
