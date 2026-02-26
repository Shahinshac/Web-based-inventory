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
  checkUserValidity
} from '../services/authService'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState('cashier')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check authentication on mount
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setIsAuthenticated(true)
      setCurrentUser(user)
      setIsAdmin(isUserAdmin())
      setUserRole(getUserRole())
    }
    setLoading(false)
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

  // Check user validity periodically (for non-admin users)
  useEffect(() => {
    if (!isAuthenticated || isAdmin || !currentUser?.id) return

    const intervalId = setInterval(async () => {
      const isValid = await checkUserValidity(currentUser.id)
      if (!isValid) {
        handleLogout()
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, isAdmin, currentUser])

  const handleLogin = async (username, password) => {
    try {
      setError(null)
      const response = await loginUser(username, password)

      const user = response.user
      setIsAuthenticated(true)
      setCurrentUser(user)
      setIsAdmin(user.role === 'admin')
      setUserRole(user.role || 'cashier')
      
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
    setCurrentUser(null)
    setUserRole('cashier')
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
    currentUser,
    userRole,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    canViewProfit,
    canEdit,
    canDelete,
    canMakeSales
  }
}

