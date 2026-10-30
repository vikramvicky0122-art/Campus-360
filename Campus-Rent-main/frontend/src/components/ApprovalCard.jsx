import React from "react";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";

function ApprovalCard({ approval, onApprove, onReject }) {
  const isApproved = approval.status === BOOKING_STATUS.approved;

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
        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{approval.title}</h4>
        <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>
          Requested by {approval.requester} · {approval.dates}
        </p>
      </div>
      {isApproved ? (
        <span
          style={{
            alignSelf: "center",
            padding: "6px 12px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            background: "rgba(16, 185, 129, 0.12)",
            color: "var(--primary, #0d9488)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
          }}
        >
          Approved
        </span>
      ) : (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn outline" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => onApprove?.(approval)}>
            Approve
          </button>
          <button
            className="btn outline"
            style={{ padding: "6px 12px", fontSize: "13px", borderColor: "#e11d48", color: "#e11d48" }}
            onClick={() => onReject?.(approval)}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default ApprovalCard;
