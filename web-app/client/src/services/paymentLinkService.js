/**
 * Payment Links Service
 * Handles payment link API calls
 */

import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api';

/**
 * Create a new payment link
 */
export const createPaymentLink = async (amount, customerName, customerPhone, description = '', invoiceId = null) => {
  return await apiPost('/api/payment-links', {
    amount,
    customerName,
    customerPhone,
    description,
    invoiceId
  });
};

/**
 * Get all payment links with pagination
 */
export const fetchPaymentLinks = async (page = 1, limit = 20, status = null, customerPhone = null) => {
  let url = `/api/payment-links?page=${page}&limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (customerPhone) url += `&customerPhone=${customerPhone}`;
  return await apiGet(url);
};

/**
 * Get a specific payment link
 */
export const fetchPaymentLink = async (paymentLinkId) => {
  return await apiGet(`/api/payment-links/${paymentLinkId}`);
};

/**
 * Update payment link status
 */
export const updatePaymentLink = async (paymentLinkId, status, notes = '') => {
  return await apiPatch(`/api/payment-links/${paymentLinkId}`, {
    status,
    notes
  });
};

/**
 * Mark payment as paid
 */
export const markPaymentAsPaid = async (paymentLinkId, notes = '') => {
  return await updatePaymentLink(paymentLinkId, 'paid', notes);
};

/**
 * Cancel payment link
 */
export const cancelPaymentLink = async (paymentLinkId, notes = '') => {
  return await updatePaymentLink(paymentLinkId, 'cancelled', notes);
};

/**
 * Delete payment link
 */
export const deletePaymentLink = async (paymentLinkId) => {
  return await apiDelete(`/api/payment-links/${paymentLinkId}`);
};

/**
 * Download QR code as image
 */
export const downloadQRCode = (qrCodeBase64, transactionId) => {
  try {
    const link = document.createElement('a');
    link.href = qrCodeBase64;
    link.download = `payment-qr-${transactionId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw error;
  }
};

/**
 * Copy UPI string to clipboard
 */
export const copyToClipboard = (text) => {
  return navigator.clipboard.writeText(text);
};
