/**
 * Authentication Hook
 * Manages authentication state and operations
 */

import { useState, useEffect } from 'react'
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  isAuthenticated as checkAuth,
  isUserAdmin,
  getUserRole,
  validateSession,
  checkUserValidity,
  updateUserPhoto,
  uploadUserProfilePhoto,
  deleteUserProfilePhoto
} from '../services/authService'


export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCustomer, setIsCustomer] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState('cashier')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const user = getCurrentUser()
      if (user) {
        setIsAuthenticated(true)
        setCurrentUser(user)
        setIsAdmin(isUserAdmin())
        const role = getUserRole()
        setUserRole(role)
        setIsCustomer(role === 'customer')

        // Refresh user seamlessly to pull latest photo & info
        try {
          const session = await validateSession()
          if (session && session.valid && session.user) {
            setCurrentUser(session.user)
            localStorage.setItem('currentUser', JSON.stringify(session.user))
            localStorage.setItem('isAdmin', session.user.role === 'admin' ? 'true' : 'false')
            localStorage.setItem('userRole', session.user.role || 'cashier')
            setIsCustomer(session.user.role === 'customer')
          } else if (session && !session.valid) {
            handleLogout()
          }
        } catch (e) {
          console.error('Initial session fetch failed', e)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  // Validate session periodically
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return

    const intervalId = setInterval(async () => {
      try {
        // validateSession now verifies the JWT via the server.
        // Returns null if token is expired/invalid/session invalidated.
        const session = await validateSession()
        if (!session || !session.valid) {
          handleLogout()
        }
      } catch (error) {
        console.error('Session validation error:', error)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(intervalId)
  }, [isAuthenticated, currentUser])

  // Check user validity periodically (ONLY for staff users, not customers or admins)
  useEffect(() => {
    if (!isAuthenticated || isAdmin || isCustomer || !currentUser?.id) return

    const intervalId = setInterval(async () => {
      const isValid = await checkUserValidity(currentUser.id)
      if (!isValid) {
        handleLogout()
      }
    }, 60000) // Increase to 60 seconds to reduce load

    return () => clearInterval(intervalId)
  }, [isAuthenticated, isAdmin, isCustomer, currentUser])

  const handleLogin = async (username, password, userMode = 'staff', preFetchedToken = null) => {
    try {
      setError(null)

      // Customer login: Login.jsx already fetched the token from /api/customer-auth/login
      // and passes it here. We just need to store it and set auth state.
      if (userMode === 'customer' && preFetchedToken) {
        // Decode the JWT payload (base64) to extract user info
        let customerUser = {}
        try {
          const payloadB64 = preFetchedToken.split('.')[1]
          const payload = JSON.parse(atob(payloadB64))
          customerUser = {
            id: payload.userId,
            email: payload.email,
            name: payload.name,
            role: 'customer'
          }
        } catch (e) {
          console.error('Failed to decode customer JWT', e)
        }

        // Persist session exactly like loginUser does
        localStorage.setItem('authToken', preFetchedToken)
        localStorage.setItem('currentUser', JSON.stringify(customerUser))
        localStorage.setItem('isAdmin', 'false')
        localStorage.setItem('userRole', 'customer')

        setIsAuthenticated(true)
        setCurrentUser(customerUser)
        setIsAdmin(false)
        setUserRole('customer')
        setIsCustomer(true)
        return { success: true, user: customerUser }
      }

      // Staff login flow (unchanged)
      const response = await loginUser(username, password, userMode)
      const user = response.user
      setIsAuthenticated(true)
      setCurrentUser(user)
      setIsAdmin(user.role === 'admin')
      const role = user.role || 'cashier'
      setUserRole(role)
      setIsCustomer(role === 'customer')

      return { success: true, user }
    } catch (err) {
      setError(err.message || 'Login failed')
      return { success: false, error: err.message }
    }
  }

  const handleRegister = async (username, password, email) => {
    try {
      setError(null)
      await registerUser(username, password, email)
      return { success: true }
    } catch (err) {
      setError(err.message || 'Registration failed')
      return { success: false, error: err.message }
    }
  }

  const handleLogout = () => {
    logoutUser()
    setIsAuthenticated(false)
    setIsAdmin(false)
    setIsCustomer(false)
    setCurrentUser(null)
    setUserRole('cashier')
  }

  /**
   * Upload a new profile photo for the current user.
   * Sends the file to the backend (Cloudinary), then updates local state.
   * @param {File} file
   * @returns {Promise<string>} The new Cloudinary CDN URL
   */
  const handleUpdateUserPhoto = async (file) => {
    if (!currentUser?.id) throw new Error('Not logged in')
    const result = await uploadUserProfilePhoto(currentUser.id, file)
    if (result?.photo) {
      updateUserPhoto(result.photo)
      setCurrentUser(prev => ({ ...prev, photo: result.photo }))
    }
    return result?.photo || null
  }

  /**
   * Remove the current user's profile photo.
   */
  const handleDeleteUserPhoto = async () => {
    if (!currentUser?.id) throw new Error('Not logged in')
    await deleteUserProfilePhoto(currentUser.id)
    updateUserPhoto(null)
    setCurrentUser(prev => ({ ...prev, photo: null }))
  }

  // Permission helpers
  const canViewProfit = () => {
    return userRole === 'admin' || userRole === 'manager' || isAdmin
  }

  const canEdit = () => {
    return userRole === 'admin' || userRole === 'manager' || isAdmin
  }

  const canDelete = () => {
    return userRole === 'admin' || isAdmin
  }

  const canMakeSales = () => {
    return isAuthenticated
  }

  return {
    isAuthenticated,
    isAdmin,
    isCustomer,
    currentUser,
    userRole,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    handleUpdateUserPhoto,
    handleDeleteUserPhoto,
    canViewProfit,
    canEdit,
    canDelete,
    canMakeSales
  }
}

