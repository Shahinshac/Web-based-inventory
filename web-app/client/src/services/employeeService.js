import config from '../config';

const API_URL = `${config.API_URL}/employees`;
const SALARY_API_URL = `${config.API_URL}/salary`;

export const employeeService = {
  // Get all employees
  async getEmployees() {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch employees');
    }

    return await response.json();
  },

  // Create new employee
  async createEmployee(employeeData) {
    const response = await fetch(`${API_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(employeeData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create employee');
    }

    return await response.json();
  },

  // Update employee
  async updateEmployee(employeeId, employeeData) {
    const response = await fetch(`${API_URL}/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(employeeData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update employee');
    }

    return await response.json();
  },

  // Delete (deactivate) employee
  async deleteEmployee(employeeId) {
    const response = await fetch(`${API_URL}/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete employee');
    }

    return await response.json();
  },

  // Get salary history for employee
  async getSalaryHistory(employeeId) {
    const response = await fetch(`${API_URL}/${employeeId}/salary-history`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch salary history');
    }

    return await response.json();
  },

  // Trigger manual monthly salary processing
  async processMonthly() {
    const response = await fetch(`${SALARY_API_URL}/process-monthly`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to process salaries');
    }

    return await response.json();
  },

  // Get salary summary for all employees
  async getSalarySummary() {
    const response = await fetch(`${SALARY_API_URL}/summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch salary summary');
    }

    return await response.json();
  },

  // Get salary summary for specific employee
  async getEmployeeSalarySummary(employeeId) {
    const response = await fetch(`${SALARY_API_URL}/summary/${employeeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch employee salary summary');
    }

    return await response.json();
  }
};

export default employeeService;
