import React from "react";
import { useNavigate } from "react-router-dom";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

function ItemCard({ item }) {
  const navigate = useNavigate();

  const goToDetails = () => {
    navigate(`/item/${item.id}`);
  };

  const title = item.title || item.name;
  const priceDisplay = item.pricePerDay ? `Rs ${item.pricePerDay} ` : "";
  const numReviews = item.reviewsCount ? `(${item.reviewsCount})` : "(0)";
  const badgeLabel = item.isVerified ? "Verified" : "Featured";
  const rentedUntilLabel = item.rentedUntil
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.rentedUntil))
    : "";

  const isManuallyUnavailable =
    Boolean(item.isHidden) || String(item.availability || "").toLowerCase().includes("not available");
  const media = resolveMediaDisplay(item.images?.[0], "purple");

  return (
    <article
      className="marketplace-card"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
      onClick={goToDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToDetails();
        }
      }}
    >
      <div className={media.className} style={media.style}>
        <span className="marketplace-card-badge">{badgeLabel}</span>
      </div>

      <div className="marketplace-card-body">
        <h3 className="marketplace-card-title">{title}</h3>
        <div className="marketplace-card-location">{item.location}</div>
        {rentedUntilLabel && (
          <div
            style={{
              marginTop: "8px",
              marginBottom: "8px",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            Rented until {rentedUntilLabel}
          </div>
        )}

        <div className="marketplace-card-price-row">
          <div className="marketplace-card-price">
            {priceDisplay}
            {item.pricePerDay && <span>/ day</span>}
          </div>
          <div className="marketplace-rating-info">
            {item.rating || "4.8"} <span className="reviews">{numReviews}</span>
          </div>
        </div>

        <div className="marketplace-card-actions">
          <button
            type="button"
            className="btn primary"
            disabled={isManuallyUnavailable}
            onClick={(e) => {
              e.stopPropagation();
              if (isManuallyUnavailable) return;
              navigate(`/booking/${item.id}`);
            }}
          >
            Rent Now
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={(e) => {
              e.stopPropagation();
              goToDetails();
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}

export default ItemCard;
