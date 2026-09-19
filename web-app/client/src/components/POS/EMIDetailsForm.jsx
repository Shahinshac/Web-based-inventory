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
    <div className="emi-details-form" style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--surface-subtle, #f8fafc)', borderRadius: 'var(--radius, 8px)', border: '1px solid var(--border, #e2e8f0)' }}>
      <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary, #475569)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon name="calendar" size={14} />
        EMI Schedule Details
      </h5>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
            Tenure (Months)
          </label>
          <div style={{ position: 'relative' }}>
            <select
              name="tenure"
              value={months}
              onChange={(e) => onMonthsChange(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            >
              <option value="">Select months</option>
              {(tenureOptions || [3, 6, 12, 24]).map((option) => (
                <option key={option} value={option}>{option} months</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
            Monthly EMI (Auto)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={emiAmount}
              readOnly
              placeholder="Auto-calculated"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f1f5f9' }}
            />
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary, #475569)', marginBottom: '4px' }}>
            Down Payment (₹)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              name="downPayment"
              type="number"
              value={downPayment}
              onChange={(e) => {
                let val = e.target.value;
                if (/^0[0-9]+/.test(val)) val = val.replace(/^0+(?=\d)/, '');
                if (val.startsWith('-')) val = val.replace(/^-+/, '');
                onDownPaymentChange(val);
              }}
              placeholder="0.00"
              min="0"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '12px', padding: '12px', background: 'var(--success-subtle, #ecfdf5)', border: '1px solid var(--success-border, #a7f3d0)', borderRadius: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--success, #059669)' }}>
          <span>Total Bill</span>
          <strong>₹{Number(totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--success, #059669)', marginTop: '4px' }}>
          <span>Financed Amount</span>
          <strong>₹{Number(financedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
  );
}
