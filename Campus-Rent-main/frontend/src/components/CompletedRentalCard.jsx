import React from "react";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

function CompletedRentalCard({ rental, onRateOwner }) {
  const statusLabel = rental.statusLabel || "Completed";
  const isCompleted = statusLabel.toLowerCase() === "completed";
  const statusStyle = isCompleted
    ? {
        background: "rgba(16, 185, 129, 0.12)",
        color: "var(--primary, #0d9488)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
      }
    : statusLabel.toLowerCase() === "cancelled"
      ? {
          background: "rgba(245, 158, 11, 0.12)",
          color: "#b45309",
          border: "1px solid rgba(245, 158, 11, 0.25)",
        }
      : {
          background: "rgba(239, 68, 68, 0.12)",
          color: "#b91c1c",
          border: "1px solid rgba(239, 68, 68, 0.25)",
        };

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
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{rental.name}</h3>
            <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Owner: {rental.owner}</p>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              ...statusStyle,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div style={{ display: "grid", gap: "6px", color: "var(--muted, #6b7280)", fontSize: "14px" }}>
          <div>
            {isCompleted
              ? `Returned on ${rental.returned}`
              : statusLabel.toLowerCase() === "cancelled"
                ? `Cancelled by ${rental.cancelledBy || "borrower"}`
                : "Request was rejected by lender"}
          </div>
          {rental.dates && <div>Booking dates: {rental.dates}</div>}
        </div>

        {isCompleted && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="btn outline"
              style={{ padding: "8px 14px", fontSize: "14px" }}
              onClick={() => onRateOwner?.(rental)}
            >
              Rate Owner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompletedRentalCard;
