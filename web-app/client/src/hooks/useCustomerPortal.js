/**
 * Customer Portal Hook
 * Manages customer portal data and operations
 */

import { useState, useEffect } from 'react';
import {
  fetchDashboardStats,
  fetchCustomerInvoices,
  fetchCustomerWarranties,
  fetchCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword
} from '../services/customerPortalService';

export const useCustomerPortal = (currentUser) => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [profile, setProfile] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all customer data
   */
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, invoicesRes, warrantiesRes] = await Promise.all([
        fetchDashboardStats(),
        fetchCustomerInvoices(),
        fetchCustomerWarranties()
      ]);

      setDashboardStats(statsRes);
      setInvoices(invoicesRes.invoices || []);
      setWarranties(warrantiesRes.warranties || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch dashboard stats
   */
  const loadDashboardStats = async () => {
    try {
      const stats = await fetchDashboardStats();
      setDashboardStats(stats);
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * Update profile
   */
  const updateProfile = async (data) => {
    try {
      setLoading(true);
      await updateCustomerProfile(data);
      setProfile(prev => ({ ...prev, ...data }));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change password
   */
  const changePassword = async (oldPassword, newPassword) => {
    try {
      setLoading(true);
      await changeCustomerPassword(oldPassword, newPassword);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser]);

  return {
    dashboardStats,
    invoices,
    warranties,
    profile,
    loading,
    error,
    fetchAllData,
    loadDashboardStats,
    updateProfile,
    changePassword
  };
};
