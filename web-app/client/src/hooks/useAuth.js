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
  updateUserPhoto
} from '../services/authService'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState('cashier')
  const [profilePhoto, setProfilePhoto] = useState(null)
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
      setProfilePhoto(user.photo || null)
    }
    setLoading(false)
  }, [])

  // Validate session periodically
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return

    const intervalId = setInterval(async () => {
      try {
        const stored = getCurrentUser()
        if (!stored || !stored.sessionVersion) return
        
        const session = await validateSession(stored.username)
        if (session && session.sessionVersion !== stored.sessionVersion) {
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
      
      if (!response.user.approved) {
        setError('Your account is pending admin approval')
        return { success: false, error: 'Account pending approval' }
      }

      const user = response.user
      setIsAuthenticated(true)
      setCurrentUser(user)
      setIsAdmin(user.role === 'admin')
      setUserRole(user.role || 'cashier')
      setProfilePhoto(user.photo || null)
      
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
    setProfilePhoto(null)
  }

  const handlePhotoUpdate = (newPhotoUrl) => {
    setProfilePhoto(newPhotoUrl)
    // Update in localStorage
    updateUserPhoto(newPhotoUrl)
    // Update currentUser state
    if (currentUser) {
      setCurrentUser({ ...currentUser, photo: newPhotoUrl })
    }
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
    profilePhoto,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
    handlePhotoUpdate,
