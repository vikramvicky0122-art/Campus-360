import React from "react";

function BookingForm({ startDate, endDate, onStartChange, onEndChange, error, totalDays }) {
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="booking-form" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow)' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Select Rental Dates</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Pickup Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => onStartChange(e.target.value)} 
            min={todayStr}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Return Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => onEndChange(e.target.value)} 
            min={startDate || todayStr}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '15px', outline: 'none' }}
          />
        </div>
      </div>
      
      {error && (
        <div style={{ marginTop: '16px', color: '#e11d48', fontSize: '14px', padding: '10px 14px', background: 'rgba(225, 29, 72, 0.1)', borderRadius: '8px' }}>
          ⚠️ {error}
        </div>
      )}
      
      {!error && totalDays > 0 && (
        <div style={{ marginTop: '16px', color: 'var(--primary)', fontSize: '14px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', fontWeight: 500 }}>
          Rental duration: {totalDays} {totalDays === 1 ? 'day' : 'days'}
        </div>
      )}
    </div>
  );
}

export default BookingForm;
