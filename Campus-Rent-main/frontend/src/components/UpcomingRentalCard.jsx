import React from "react";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

function UpcomingRentalCard({ rental, onCancel, onChat }) {
  const media = resolveMediaDisplay(rental.image, "teal");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: "20px",
        padding: "20px",
        borderRadius: "16px",
        border: "1px solid var(--border, #e5e7eb)",
        background: "var(--surface, #ffffff)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        className={media.className}
        style={{ ...media.style, width: "160px", height: "120px", borderRadius: "12px" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{rental.name}</h3>
          <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Owner: {rental.owner}</p>
        </div>

        <div style={{ display: "grid", gap: "6px", color: "var(--muted, #6b7280)", fontSize: "14px" }}>
          <div>Pickup date: {rental.pickup}</div>
          <div>Reserved dates: {rental.dates}</div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px", borderColor: "#e11d48", color: "#e11d48" }}
            onClick={() => onCancel?.(rental)}
          >
            Cancel Booking
          </button>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px" }}
            onClick={() => onChat?.(rental)}
          >
            Chat with Owner
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpcomingRentalCard;
