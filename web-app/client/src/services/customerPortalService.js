/**
 * Customer Portal Service
 * Handles customer-specific API calls
 */

import { apiGet, apiPatch, apiPost, API, getAuthHeaders } from '../utils/api';

const normalizePagination = (pagination = {}) => ({
  page: Number(pagination.page || 1),
  limit: Number(pagination.limit || 20),
  total: Number(pagination.total || 0),
  pages: Number(pagination.pages || pagination.totalPages || 1)
});

/**
 * Fetch customer dashboard statistics
 */
export const fetchDashboardStats = async () => {
  return await apiGet('/api/customer/dashboard');
};

/**
 * Fetch customer's invoices
 */
export const fetchCustomerInvoices = async (page = 1, limit = 20) => {
  return await apiGet(`/api/customer/invoices?page=${page}&limit=${limit}`);
};

/**
 * Fetch customer's warranties
 */
export const fetchCustomerWarranties = async (page = 1, limit = 20) => {
  try {
    const response = await apiGet(`/api/customer/warranties?page=${page}&limit=${limit}`);
    return {
      ...response,
      warranties: response?.warranties || [],
      pagination: normalizePagination(response?.pagination)
    };
  } catch (error) {
    console.error('[fetchCustomerWarranties] Error:', error);
    throw error;
  }
};

/**
 * Get warranty details
 */
export const getWarrantyDetails = async (warrantyId) => {
  try {
    const response = await apiGet(`/api/customer/warranties/${warrantyId}`);
    return response?.warranty || response;
  } catch (error) {
    console.error('[getWarrantyDetails] Error:', error);
    throw error;
  }
};

/**
 * Renew warranty
 */
export const renewWarranty = async (warrantyId, years = 1) => {
  try {
    const response = await apiPost(`/api/customer/warranties/${warrantyId}/renew`, { years });
    return response;
  } catch (error) {
    console.error('[renewWarranty] Error:', error);
    throw error;
  }
};

/**
 * Fetch customer's EMI plans
 */
export const fetchCustomerEMIPlans = async (page = 1, limit = 20) => {
  try {
    const response = await apiGet(`/api/customer/emi?page=${page}&limit=${limit}`);
    return {
      ...response,
      emiPlans: response?.emiPlans || [],
      pagination: normalizePagination(response?.pagination)
    };
  } catch (error) {
    console.error('[fetchCustomerEMIPlans] Error:', error);
    throw error;
  }
};

/**
 * Get EMI plan details
 */
export const getEMIDetails = async (emiId) => {
  try {
    const response = await apiGet(`/api/customer/emi/${emiId}`);
    return response?.emi || response;
  } catch (error) {
    console.error('[getEMIDetails] Error:', error);
    throw error;
  }
};

/**
 * Download invoice PDF
 */
export const downloadInvoicePDF = async (invoiceId) => {
  try {
    console.log('[downloadInvoicePDF] 📥 Fetching invoice HTML...');

    const response = await fetch(API(`/api/customer/invoices/${invoiceId}/pdf`), {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.status}`);
    }

    const html = await response.text();

    // Open in new window
    console.log('[downloadInvoicePDF] 🖨️ Opening invoice in new window...');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();

    console.log('[downloadInvoicePDF] ✅ Invoice opened successfully');
    return true;
  } catch (error) {
    console.error('[downloadInvoicePDF] ❌ Error downloading invoice:', error);
    throw error;
  }
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

