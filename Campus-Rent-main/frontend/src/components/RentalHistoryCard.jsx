import React from "react";

function RentalHistoryCard({ rental }) {
  const statusLabel = rental.statusLabel || "Completed";
  const statusStyle =
    statusLabel.toLowerCase() === "completed"
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

  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "16px",
        border: "1px solid var(--border, #e5e7eb)",
        background: "var(--surface, #ffffff)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "16px",
      }}
    >
      <div>
        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{rental.item}</h4>
        <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>
          {rental.renter} - {rental.dates}
        </p>
        {statusLabel.toLowerCase() === "cancelled" && rental.cancelledBy && (
          <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)", fontSize: "13px" }}>
            Cancelled by {rental.cancelledBy}
          </p>
        )}
      </div>

      <div style={{ display: "grid", justifyItems: "end", gap: "8px" }}>
        <span
          style={{
            alignSelf: "center",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            ...statusStyle,
          }}
        >
          {statusLabel}
        </span>
        <span style={{ alignSelf: "center", fontWeight: 700 }}>{rental.total}</span>
      </div>
    </div>
  );
}

export default RentalHistoryCard;
