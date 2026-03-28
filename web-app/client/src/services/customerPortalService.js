/**
 * Customer Portal Service
 * Handles customer-specific API calls
 */

import { apiGet, apiPatch, apiPost } from '../utils/api';

/**
 * Fetch customer dashboard statistics
 */
export const fetchDashboardStats = async () => {
  return await apiGet('/api/customer/dashboard');
};

/**
 * Fetch customer's invoices
 */
export const fetchCustomerInvoices = async () => {
  return await apiGet('/api/customer/invoices');
};

/**
 * Fetch customer's warranties
 */
export const fetchCustomerWarranties = async () => {
  return await apiGet('/api/customer/warranties');
};

/**
 * Get customer profile
 */
export const fetchCustomerProfile = async () => {
  return await apiGet('/api/customer/profile');
};

/**
 * Update customer profile
 */
export const updateCustomerProfile = async (data) => {
  return await apiPatch('/api/customer/profile', data);
};

/**
 * Change customer password
 */
export const changeCustomerPassword = async (oldPassword, newPassword) => {
  return await apiPost('/api/customer/change-password', {
    oldPassword,
    newPassword
  });
};

/**
 * Download invoice PDF
 */
export const downloadInvoicePDF = async (invoiceId) => {
  try {
    const response = await fetch(`/api/customer/invoices/${invoiceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw error;
  }
};

/**
 * Renew warranty
 */
export const renewWarranty = async (warrantyId) => {
  return await apiPost(`/api/customer/warranties/${warrantyId}/renew`, {});
};
