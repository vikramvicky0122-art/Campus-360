import React from "react";

function PriceBreakdown({ totalDays, pricePerDay, securityDeposit = 0, serviceFee, finalTotal, isValid, onConfirm, onCancel, primaryText = "Confirm Booking" }) {
  return (
    <div className="price-breakdown" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', boxShadow: 'var(--shadow)' }}>
      <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Order Summary</h3>
      
      {totalDays > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
            <span>₹{pricePerDay} × {totalDays} {totalDays === 1 ? 'day' : 'days'}</span>
            <span>₹{(totalDays * pricePerDay)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
            <span>Security Deposit (Refundable)</span>
            <span>₹{securityDeposit}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
            <span>Campus Fee</span>
            <span>₹{serviceFee}</span>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          Select valid dates to see the price breakdown.
        </div>
      )}
      
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '24px' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '22px', marginBottom: '32px' }}>
        <span>Total</span>
        <span>₹{totalDays > 0 ? finalTotal : 0}</span>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <button 
          className="btn primary" 
          style={{ width: '100%', padding: '14px', fontSize: '16px', opacity: isValid ? 1 : 0.5, cursor: isValid ? 'pointer' : 'not-allowed' }}
          onClick={onConfirm}
          disabled={!isValid}
        >
          {primaryText}
        </button>
        {onCancel && (
          <button 
            className="btn outline" 
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            onClick={onCancel}
          >
            Cancel / Go Back
          </button>
        )}
      </div>
      
      <p style={{ display: 'block', textAlign: 'center', color: 'var(--muted)', fontSize: '12px', marginTop: '16px' }}>
        🔒 Security deposit will be refunded after safe return.
      </p>
    </div>
  );
}

export default PriceBreakdown;
