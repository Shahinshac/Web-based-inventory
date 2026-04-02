import React from 'react';
import Icon from '../../Icon';

export default function EMIDetailsForm({ 
  months, 
  downPayment, 
  totalAmount,
  financedAmount,
  emiAmount,
  tenureOptions,
  onMonthsChange, 
  onDownPaymentChange 
}) {
  return (
    <div className="emi-details-form" style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon name="calendar" size={14} />
        EMI Schedule Details
      </h5>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Tenure (Months)
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={months}
              onChange={(e) => onMonthsChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
            >
              <option value="">Select months</option>
              {(tenureOptions || [3, 6, 12, 24]).map((option) => (
                <option key={option} value={option}>{option} months</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Monthly EMI (Auto)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={emiAmount}
              readOnly
              placeholder="Auto-calculated"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Down Payment (₹)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={downPayment}
              onChange={(e) => onDownPaymentChange(e.target.value)}
              placeholder="0.00"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#065f46' }}>
          <span>Total Bill</span>
          <strong>₹{Number(totalAmount || 0).toFixed(2)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
          <span>Financed Amount</span>
          <strong>₹{Number(financedAmount || 0).toFixed(2)}</strong>
        </div>
      </div>
    </div>
  );
}
