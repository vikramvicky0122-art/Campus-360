import React from "react";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

function PendingRequestCard({ request, onCancel, onMessageOwner }) {
  const media = resolveMediaDisplay(request.image, "teal");
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
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>{request.name}</h3>
            <p style={{ margin: "6px 0 0", color: "var(--muted, #6b7280)" }}>Owner: {request.owner}</p>
          </div>
          <span
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              background: "rgba(59, 130, 246, 0.12)",
              color: "#2563eb",
              border: "1px solid rgba(59, 130, 246, 0.25)",
            }}
          >
            Awaiting approval
          </span>
        </div>

        <div style={{ display: "grid", gap: "6px", color: "var(--muted, #6b7280)", fontSize: "14px" }}>
          <div>Requested dates: {request.dates}</div>
          <div>Request submitted: {request.submitted}</div>
          <div>Estimated total: {request.total}</div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn outline" style={{ padding: "8px 14px", fontSize: "14px" }}>
            Edit request
          </button>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px", borderColor: "#e11d48", color: "#e11d48" }}
            onClick={() => onCancel?.(request)}
          >
            Cancel request
          </button>
          <button
            className="btn outline"
            style={{ padding: "8px 14px", fontSize: "14px" }}
            onClick={() => onMessageOwner?.(request)}
          >
            Message owner
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingRequestCard;
