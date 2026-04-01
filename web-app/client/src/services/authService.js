/**
 * Authentication Service
 * Handles login, registration, and session management
 */

import { API, apiPost, apiGet, apiUpload, apiDelete } from '../utils/api'

/**
 * Login user (Staff)
 */
export const loginUser = async (username, password, userMode = 'staff') => {
  const endpoint = userMode === 'customer' ? '/api/users/login-customer' : '/api/users/login'
  const response = await apiPost(endpoint, { username, password })

  if (response.user) {
    if (response.token) {
      localStorage.setItem('authToken', response.token)
    }
    const isAdmin = response.user.role === 'admin'
    localStorage.setItem('currentUser', JSON.stringify(response.user))
    localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false')
    localStorage.setItem('userRole', response.user.role || 'cashier')
  }

  return response
}

/**
 * Login customer with OTP (called after OTP verification)
 */
export const loginCustomerWithOTP = async (email, token) => {
  const response = await apiPost('/api/users/login-customer-otp', { email, token })

  if (response.user) {
    if (response.token) {
      localStorage.setItem('authToken', response.token)
    }
    localStorage.setItem('currentUser', JSON.stringify(response.user))
    localStorage.setItem('isAdmin', 'false')
    localStorage.setItem('userRole', 'customer')
  }

  return response
}

/**
 * Send OTP to email
 */
export const sendOTP = async (email, type = 'login') => {
  return await apiPost('/api/users/send-otp', { email, type })
}

/**
 * Verify OTP
 */
export const verifyOTP = async (email, otp) => {
  return await apiPost('/api/users/verify-otp', { email, otp })
}

/**
 * Register new customer
 */
export const registerCustomer = async (email, name, phone) => {
  return await apiPost('/api/users/register-customer', {
    email,
    name,
    phone,
    role: 'customer'
  })
}

/**
 * Register new staff user
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
    if (error.message.includes('Unable to connect') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      // Don't auto-logout on network drop/server offline
      return { valid: true, networkOffline: true }
    }
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
    if (error.message.includes('Unable to connect') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      // Don't auto-logout on network drop
      return true
    }
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
 * Upload a new profile photo for the given user ID
 */
export const uploadUserProfilePhoto = async (userId, file) => {
  const formData = new FormData()
  formData.append('photo', file)
  return await apiUpload(`/api/users/${userId}/photo`, formData)
}

/**
 * Delete the profile photo for the given user ID
 */
export const deleteUserProfilePhoto = async (userId) => {
  return await apiDelete(`/api/users/${userId}/photo`)
}
