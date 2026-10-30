import React from "react";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

const statusStyles = {
  Available: {
    background: "rgba(16, 185, 129, 0.12)",
    color: "var(--primary, #0d9488)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
  },
  Rented: {
    background: "rgba(99, 102, 241, 0.12)",
    color: "var(--accent, #6366f1)",
    border: "1px solid rgba(99, 102, 241, 0.25)",
  },
  Hidden: {
    background: "rgba(107, 114, 128, 0.12)",
    color: "#6b7280",
    border: "1px solid rgba(107, 114, 128, 0.25)",
  },
};

function ListingCard({
  item,
  onEdit,
  onToggleHidden,
  onDelete,
  onConfirmReturn,
  onMarkItemGiven,
  onCancelUpcoming
}) {
  const badgeStyle = statusStyles[item.status] || statusStyles.Available;
  const hasUpcoming = item.upcoming?.length > 0;
  const media = resolveMediaDisplay(item.image, "teal");

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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{item.name}</h3>
            <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>{item.price}/day</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                ...badgeStyle,
              }}
            >
              {item.status}
            </span>
            {item.isHidden && (
              <span
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  ...statusStyles.Hidden,
                }}
              >
                Hidden
              </span>
            )}
          </div>
        </div>

        {item.status === "Available" && (
          <div style={{ display: "grid", gap: "6px", color: "var(--muted, #6b7280)", fontSize: "14px" }}>
            {item.nextReservation ? (
              <>
                <div>
                  Upcoming reservation: <strong style={{ color: "var(--text-main, #1f2937)" }}>{item.nextReservation.dates}</strong>
                </div>
                <div>Reserved by {item.nextReservation.renter}</div>
              </>
            ) : (
              <div>No upcoming reservations yet.</div>
            )}
          </div>
        )}

        {item.status === "Rented" && (
          <div style={{ display: "grid", gap: "6px", color: "var(--muted, #6b7280)", fontSize: "14px" }}>
            <div>
              Current renter: <strong style={{ color: "var(--text-main, #1f2937)" }}>{item.currentRental.renter}</strong>
            </div>
            <div>Active rental: {item.currentRental.dates}</div>
            {item.currentRental.status === "return_pending" ? (
              <button className="btn primary" style={{ width: "fit-content", padding: "8px 14px", fontSize: "14px" }} onClick={() => onConfirmReturn?.(item)}>
                Confirm Return
              </button>
            ) : (
              <div>Waiting for borrower return request.</div>
            )}
          </div>
        )}

        {hasUpcoming && (
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main, #1f2937)" }}>Upcoming queue</div>
            <div style={{ display: "grid", gap: "6px" }}>
              {item.upcoming.map((reservation) => (
                <div
                  key={reservation.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "10px",
                    background: "var(--bg, #f8fafc)",
                    border: "1px solid var(--border, #e5e7eb)",
                    fontSize: "13px",
                    color: "var(--muted, #6b7280)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{reservation.dates} · {reservation.renter}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => onMarkItemGiven?.(reservation.id)}
                      disabled={reservation.status !== "approved"}
                      style={{ background: "none", border: "none", color: "#0d9488", cursor: "pointer", fontSize: "13px", fontWeight: 600, padding: "4px 8px", opacity: reservation.status === "approved" ? 1 : 0.45 }}
                    >
                      {reservation.status === "approved" ? "Mark Given" : "Given"}
                    </button>
                    <button
                      onClick={() => onCancelUpcoming?.(reservation.id)}
                      style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "13px", fontWeight: 600, padding: "4px 8px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px" }}
            onClick={() => onEdit?.(item)}
          >
            Edit Listing
          </button>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px" }}
            onClick={() => onToggleHidden?.(item)}
          >
            {item.isHidden ? "Unhide Listing" : "Hide Listing"}
          </button>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px", borderColor: "#e11d48", color: "#e11d48" }}
            onClick={() => onDelete?.(item)}
          >
            Delete Listing
          </button>
        </div>
      </div>
    </div>
  );
}

export default ListingCard;

