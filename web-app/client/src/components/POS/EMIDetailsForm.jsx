import React from 'react';
import Icon from '../../Icon';

export default function EMIDetailsForm({ 
  months, 
  emiAmount, 
  downPayment, 
  onMonthsChange, 
  onEmiAmountChange, 
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
            <input
              type="number"
              value={months}
              onChange={(e) => onMonthsChange(e.target.value)}
              placeholder="e.g. 6"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Monthly EMI (₹)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={emiAmount}
              onChange={(e) => onEmiAmountChange(e.target.value)}
              placeholder="0.00"
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
    </div>
  );
}
