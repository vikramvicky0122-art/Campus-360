import React, { useState } from "react";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

function ItemGallery({ images = [], fallbackClass = "purple" }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const mainImage = images.length > 0 ? images[activeIndex] : fallbackClass;
  const mainMedia = resolveMediaDisplay(mainImage, fallbackClass || "purple");

  return (
    <div className="item-gallery">
      {/* Main Large Image */}
      <div 
        className={`${mainMedia.className} skeleton-bg`} 
        style={{ 
          ...mainMedia.style,
          width: '100%', 
          aspectRatio: '4/3', 
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          marginBottom: '16px',
          transition: 'background 0.3s ease'
        }}
      ></div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          {images.map((imgClass, idx) => {
            const thumbMedia = resolveMediaDisplay(imgClass, fallbackClass || "purple");
            return (
            <div 
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={thumbMedia.className}
              style={{ 
                ...thumbMedia.style,
                flexShrink: 0,
                width: '80px', 
                height: '80px', 
                borderRadius: '10px', 
                cursor: 'pointer',
                border: idx === activeIndex ? '2px solid var(--primary)' : '1px solid var(--border)',
                opacity: idx === activeIndex ? 1 : 0.6,
                transition: 'all 0.2s ease',
                transform: idx === activeIndex ? 'scale(1.05)' : 'scale(1)'
              }}
            ></div>
          )})}
        </div>
      )}
    </div>
  );
}

export default ItemGallery;
