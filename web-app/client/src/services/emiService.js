import { apiGet, apiPost, apiPatch } from '../utils/api';

export const emiService = {
  /**
   * Create a new EMI plan during checkout
   */
  async createEMIPlan(emiData) {
    try {
      return await apiPost('/api/emi/', emiData);
    } catch (error) {
      console.error('EMI creation error:', error);
      throw error;
    }
  },

  /**
   * Get detailed EMI plan
   */
  async getEMIPlan(emiId) {
    try {
      return await apiGet(`/api/emi/${emiId}`);
    } catch (error) {
      console.error('EMI fetch error:', error);
      throw error;
    }
  },

  /**
   * Get all EMI plans for a customer
   */
  async getCustomerEMIPlans(customerId, options = {}) {
    try {
      const { page = 1, limit = 10, status } = options;
      let url = `/api/emi/customer/${customerId}?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;

      return await apiGet(url);
    } catch (error) {
      console.error('Customer EMI fetch error:', error);
      throw error;
    }
  },

  /**
   * Record payment for an EMI installment
   */
  async recordEMIPayment(emiId, paymentData) {
    try {
      return await apiPatch(`/api/emi/${emiId}/payment`, paymentData);
    } catch (error) {
      console.error('EMI payment error:', error);
      throw error;
    }
  },

  /**
   * Update EMI plan status (admin only)
   */
  async updateEMIStatus(emiId, status) {
    try {
      return await apiPatch(`/api/emi/${emiId}/status`, { status });
    } catch (error) {
      console.error('EMI status update error:', error);
      throw error;
    }
  },

  /**
   * Get EMI summary for dashboard
   */
  async getEMISummary(customerId) {
    try {
      const data = await this.getCustomerEMIPlans(customerId, { limit: 100, status: 'active' });

      if (!data.data || data.data.length === 0) {
        return {
          activeEMIs: 0,
          totalOutstanding: 0,
          nextDueDate: null,
          nextDueAmount: 0
        };
      }

      let totalOutstanding = 0;
      let nextDueDate = null;
      let nextDueAmount = 0;

      data.data.forEach(plan => {
        if (plan.summary) {
          totalOutstanding += plan.summary.totalPending || 0;
          if (!nextDueDate || new Date(plan.summary.nextDueDate) < new Date(nextDueDate)) {
            nextDueDate = plan.summary.nextDueDate;
            nextDueAmount = plan.summary.nextDueAmount || 0;
          }
        }
      });

      return {
        activeEMIs: data.data.filter(p => p.status === 'active').length,
        totalOutstanding,
        nextDueDate,
        nextDueAmount
      };
    } catch (error) {
      console.error('EMI summary error:', error);
      return {
        activeEMIs: 0,
        totalOutstanding: 0,
        nextDueDate: null,
        nextDueAmount: 0
      };
    }
  }
};

export default emiService;
