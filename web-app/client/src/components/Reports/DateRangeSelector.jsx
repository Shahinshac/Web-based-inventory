import React from 'react';
import Input from '../Common/Input';

export default function DateRangeSelector({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}) {
  const today = new Date().toISOString().split('T')[0];

  const setPreset = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preset === 'today') {
      onStartDateChange(todayStr);
      onEndDateChange(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      onStartDateChange(firstDay);
      onEndDateChange(todayStr);
    } else if (preset === 'last30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      onStartDateChange(past);
      onEndDateChange(todayStr);
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      onStartDateChange(firstDay);
      onEndDateChange(todayStr);
    } else if (preset === 'all') {
      onStartDateChange('');
      onEndDateChange('');
    }
  };

  const hasFilter = Boolean(startDate || endDate);

  return (
    <div className="date-range-selector card">
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '160px' }}>
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={endDate || today}
          />
        </div>
        
        <div style={{ minWidth: '160px' }}>
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            max={today}
          />
        </div>

        {hasFilter && (
          <button
            type="button"
            className="clear-date-btn"
            style={{ marginTop: '20px' }}
            onClick={() => setPreset('all')}
          >
            ✕ Clear Filter
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
          Quick Filters:
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => setPreset('today')}
        >
          Today
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => setPreset('month')}
        >
          This Month
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => setPreset('last30')}
        >
          Last 30 Days
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => setPreset('year')}
        >
          This Year
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => setPreset('all')}
        >
          All Time
        </button>
      </div>
    </div>
  );
}
