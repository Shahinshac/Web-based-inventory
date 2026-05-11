/**
 * Support Ticketing Service
 * Handles API calls for both Customer and Admin ticket management
 */

import { apiGet, apiPost, apiPatch } from '../utils/api';

/**
 * CUSTOMER METHODS
 */

export const fetchCustomerTickets = async () => {
  const response = await apiGet('/api/tickets/customer');
  return response?.tickets || [];
};

export const createTicket = async (data) => {
  return await apiPost('/api/tickets/customer', data);
};

export const addTicketMessage = async (ticketId, message) => {
  return await apiPost(`/api/tickets/${ticketId}/message`, { message });
};

/**
 * ADMIN METHODS
 */

export const fetchAllTickets = async (status = '') => {
  const response = await apiGet(`/api/tickets/admin${status ? `?status=${status}` : ''}`);
  return response?.tickets || [];
};

export const updateTicketStatus = async (ticketId, status) => {
  return await apiPatch(`/api/tickets/admin/${ticketId}/status`, { status });
};

export const updateTicketPriority = async (ticketId, priority) => {
  return await apiPatch(`/api/tickets/admin/${ticketId}/status`, { priority });
};
