import React, { useState, useEffect } from 'react';
import employeeService from '../../services/employeeService';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import ConfirmDialog from '../Common/ConfirmDialog';
import Toast from '../Common/Toast';
import Icon from '../../Icon';
import { formatCurrency } from '../../constants';
import './Employees.css';

export default function Employees() {
  const [employees, employees$set] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'cashier',
    salaryAmount: '',
    salaryDay: 1
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getEmployees();
      employees$set(data);
    } catch (err) {
      console.error('Error loading employees:', err);
      setToastMessage({ type: 'error', text: 'Failed to load employees' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.salaryAmount) {
      setToastMessage({ type: 'error', text: 'Please fill all required fields' });
      return;
    }

    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee.id, formData);
        setToastMessage({ type: 'success', text: 'Employee updated successfully' });
      } else {
        await employeeService.createEmployee(formData);
        setToastMessage({ type: 'success', text: 'Employee created successfully' });
      }

      resetForm();
      loadEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      setToastMessage({ type: 'error', text: err.message || 'Failed to save employee' });
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      role: employee.role,
      salaryAmount: employee.salaryAmount,
      salaryDay: employee.salaryDay
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    try {
      await employeeService.deleteEmployee(selectedEmployee.id);
      setToastMessage({ type: 'success', text: 'Employee deactivated successfully' });
      setShowDeleteConfirm(false);
      resetForm();
      loadEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setToastMessage({ type: 'error', text: 'Failed to delete employee' });
    }
  };

  const handleViewHistory = async (employee) => {
    try {
      const history = await employeeService.getSalaryHistory(employee.id);
      setSalaryHistory(history);
      setShowHistory(true);
    } catch (err) {
      console.error('Error fetching salary history:', err);
      setToastMessage({ type: 'error', text: 'Failed to fetch salary history' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'cashier',
      salaryAmount: '',
      salaryDay: 1
    });
    setSelectedEmployee(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading-container">Loading employees...</div>;
  }

  return (
    <div className="employees-container">
      <div className="employees-header">
        <h2>Employees & Salaries</h2>
        <Button variant="primary" onClick={() => setShowForm(true)}>
          <Icon name="plus" /> Add Employee
        </Button>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {employees.length === 0 ? (
        <div className="empty-state">
          <p>No employees added yet</p>
          <p className="text-secondary">Click "Add Employee" to create a new employee record</p>
        </div>
      ) : (
        <div className="employees-grid">
          {employees.map((emp) => (
            <div key={emp.id} className="employee-card">
              <div className="card-header">
                <h3>{emp.name}</h3>
                <span className={`badge ${emp.isActive ? 'active' : 'inactive'}`}>
                  {emp.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <label>Role:</label>
                  <span>{emp.role}</span>
                </div>

                <div className="info-row">
                  <label>Monthly Salary:</label>
                  <span className="salary-amount">{formatCurrency(emp.salaryAmount)}</span>
                </div>

                <div className="info-row">
                  <label>Salary Day:</label>
                  <span>{emp.salaryDay}th of every month</span>
                </div>
              </div>

              <div className="card-actions">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleViewHistory(emp)}
                  title="View salary payment history"
                >
                  <Icon name="history" /> History
                </Button>

                {emp.isActive && (
                  <>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleEdit(emp)}
                      title="Edit employee"
                    >
                      <Icon name="edit" /> Edit
                    </Button>

                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setShowDeleteConfirm(true);
                      }}
                      title="Deactivate employee"
                    >
                      <Icon name="trash" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Employee Form Modal */}
      {showForm && (
        <Modal title={selectedEmployee ? 'Edit Employee' : 'Add New Employee'} onClose={resetForm}>
          <form onSubmit={handleSubmit} className="employee-form">
            <div className="form-group">
              <label htmlFor="name">Employee Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter employee name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="cashier">Cashier</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="salary">Monthly Salary (₹) *</label>
              <input
                id="salary"
                type="number"
                placeholder="Enter monthly salary"
                value={formData.salaryAmount}
                onChange={(e) => setFormData({ ...formData, salaryAmount: parseFloat(e.target.value) })}
                min="0"
                step="100"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="salaryDay">Salary Payment Day</label>
              <input
                id="salaryDay"
                type="number"
                placeholder="Day of month (1-31)"
                value={formData.salaryDay}
                onChange={(e) => {
                  let day = parseInt(e.target.value);
                  if (day < 1) day = 1;
                  if (day > 31) day = 31;
                  setFormData({ ...formData, salaryDay: day });
                }}
                min="1"
                max="31"
              />
              <small>Salary will be automatically added on this day each month</small>
            </div>

            <div className="form-actions">
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {selectedEmployee ? 'Update Employee' : 'Create Employee'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && selectedEmployee && (
        <ConfirmDialog
          title="Deactivate Employee"
          message={`Are you sure you want to deactivate ${selectedEmployee.name}? They will no longer receive automatic salary payments.`}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedEmployee(null);
          }}
          confirmText="Deactivate"
          cancelText="Cancel"
          isDangerous={true}
        />
      )}

      {/* Salary History Modal */}
      {showHistory && salaryHistory && (
        <Modal title={`Salary History - ${salaryHistory.employee.name}`} onClose={() => setShowHistory(false)}>
          <div className="salary-history">
            <div className="history-summary">
              <div className="summary-item">
                <label>Monthly Salary:</label>
                <span>{formatCurrency(salaryHistory.employee.salaryAmount)}</span>
              </div>
              <div className="summary-item">
                <label>Total Payments:</label>
                <span>{salaryHistory.salaryHistory.length}</span>
              </div>
            </div>

            {salaryHistory.salaryHistory.length === 0 ? (
              <p className="text-secondary">No salary payments recorded yet</p>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryHistory.salaryHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.date).toLocaleDateString()}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
