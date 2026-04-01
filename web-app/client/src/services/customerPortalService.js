/**
 * Customer Portal Service
 * Handles customer-specific API calls
 */

import { apiGet, apiPatch, apiPost, API, getAuthHeaders } from '../utils/api';

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
    const response = await fetch(API(`/api/customer/invoices/${invoiceId}/pdf`), {
      method: 'GET',
      headers: getAuthHeaders()
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

/**
 * Download customer vCard
 */
export const downloadVCard = async () => {
  try {
    const response = await fetch(API('/api/customer/vcard'), {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to download vCard');
    
    const text = await response.text();
    const blob = new Blob([text], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business_contact.vcf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('vCard download error:', error);
    throw error;
  }
};

/**
 * Download PVC Membership Card
 */
export const downloadPVCCard = async () => {
  try {
    const response = await fetch(API('/api/customer/pvc-card'), {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to download identity card');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'membership_card.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('PVC Card download error:', error);
    throw error;
  }
};

