import React from "react";

function ItemInfo({ item }) {
  const badgeLabel = item.isVerified ? "Verified Student" : "Student Listing";
  const numReviews = item.reviewsCount ? `(${item.reviewsCount} reviews)` : `(0 reviews)`;
  
  return (
    <div className="item-info">
      {/* Title & Meta Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <span style={{ 
          padding: '6px 12px', 
          background: item.isVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
          color: item.isVerified ? 'var(--primary)' : 'var(--accent)', 
          borderRadius: '999px', fontSize: '13px', fontWeight: 600 
        }}>
          {badgeLabel}
        </span>
        <span style={{ fontSize: '14px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          📍 {item.location}
        </span>
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.2, marginBottom: '16px' }}>
        {item.title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '8px' }}>
        <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
          ₹{item.pricePerDay} <span style={{ fontSize: '16px', color: 'var(--muted)', fontWeight: 500 }}>/ day</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px' }}>
        <span style={{ color: '#b46a00' }}>⭐ {item.rating || "0.0"}</span>
        <span style={{ color: 'var(--muted)' }}>{numReviews}</span>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

      {/* Description Body */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Description</h3>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6, fontSize: '15px' }}>
          {item.description || "No description provided."}
        </p>
      </div>

      {/* Specs Grid */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', 
        background: 'var(--surface)', padding: '16px', borderRadius: '12px', 
        border: '1px solid var(--border)', marginTop: '24px' 
      }}>
        <div>
          <span style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Category</span>
          <span style={{ fontWeight: 600 }}>{item.category || "General"}</span>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Availability</span>
          <span style={{ 
            fontWeight: 600, 
            color: item.availability === "Available Now" ? 'var(--primary)' : 'var(--muted)', 
            display: 'flex', alignItems: 'center', gap: '6px' 
          }}>
            <span style={{ 
              width: '8px', height: '8px', borderRadius: '50%', 
              background: item.availability === "Available Now" ? 'var(--primary)' : 'var(--muted)' 
            }}></span>
            {item.availability || "Unknown"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ItemInfo;
