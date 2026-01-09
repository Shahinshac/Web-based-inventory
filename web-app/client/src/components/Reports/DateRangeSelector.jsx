import React from 'react';
import Input from '../Common/Input';

export default function DateRangeSelector({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="date-range-selector">
      <Input
        label="Start Date"
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        max={endDate || today}
      />
      
      <Input
        label="End Date"
        type="date"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        min={startDate}
        max={today}
      />
    </div>
  );
}
