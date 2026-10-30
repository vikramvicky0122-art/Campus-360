import React, { useMemo, useState } from "react";
import BorrowedItemCard from "../components/BorrowedItemCard.jsx";
import UpcomingRentalCard from "../components/UpcomingRentalCard.jsx";
import CompletedRentalCard from "../components/CompletedRentalCard.jsx";
import PendingRequestCard from "../components/PendingRequestCard.jsx";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import { useBookings } from "../context/BookingContext.jsx";

const tabs = ["Pending", "Active Rentals", "History"];


const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
};

const formatFullDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
};

const formatPickupDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatRange = (start, end) => {
  if (!start && !end) return "";
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
};

const formatCurrency = (value) => {
  if (typeof value !== "number") return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
};

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = String(item?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function MyBookings() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const { bookings, cancelBooking, confirmItemReceived, requestReturn } = useBookings();
  const handleComingSoon = () => {
    window.alert("Feature coming soon");
  };

  const { pending, activeRentals, history } = useMemo(() => {
    const normalized = uniqueById(bookings)
      .map((booking) => {
        const name = booking.title || "Item";
        const image = booking.image || "teal";
        const owner = booking.owner || "Campus 360 Owner";
        const dates = formatRange(booking.start, booking.end);
        const submitted = formatFullDate(booking.submittedAt);
        const pickup = formatPickupDate(booking.pickupAt || booking.start);
        const returned = formatFullDate(booking.returnedAt || booking.end);
        const deposit = formatCurrency(booking.depositAmount);
        const total = formatCurrency(booking.totalAmount);
        const statusLabel =
          booking.status === BOOKING_STATUS.cancelled
            ? "Cancelled"
            : booking.status === BOOKING_STATUS.rejected
              ? "Rejected"
              : booking.status === BOOKING_STATUS.completed
                ? "Completed"
                : booking.status;
        const timelineAt = booking.cancelledAt || booking.returnedAt || booking.end || booking.submittedAt || "";
        return {
          id: booking.id,
          status: booking.status,
          statusLabel,
          cancelledBy: booking.cancelledBy || null,
          timelineAt,
          name,
          owner,
          dates,
          submitted,
          pickup,
          returned,
          deposit,
          total,
          image,
        };
      })
      .filter((booking) => booking.status);

    return {
      pending: normalized.filter((booking) => booking.status === BOOKING_STATUS.requested),
      activeRentals: normalized.filter((booking) =>
        [BOOKING_STATUS.approved, BOOKING_STATUS.itemGiven, BOOKING_STATUS.ongoing, BOOKING_STATUS.returnPending].includes(booking.status)
      ),
      history: normalized
        .filter((booking) =>
          [BOOKING_STATUS.completed, BOOKING_STATUS.cancelled, BOOKING_STATUS.rejected].includes(
            booking.status
          )
        )
        .sort((a, b) => new Date(b.timelineAt) - new Date(a.timelineAt)),
    };
  }, [bookings]);

  const stats = [
    { label: "Pending Requests", value: String(pending.length) },
    { label: "Active Rentals", value: String(activeRentals.length) },
    { label: "History Records", value: String(history.length) },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "32px", fontFamily: '"Space Grotesk", sans-serif', marginBottom: "8px" }}>
          My Borrowings
        </h1>
        <p style={{ color: "var(--muted, #6b7280)" }}>
          Track pending approvals, upcoming pickups, active borrowings, and completed returns.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "18px",
              borderRadius: "16px",
              border: "1px solid var(--border, #e5e7eb)",
              background: "var(--surface, #ffffff)",
              boxShadow: "var(--shadow)",
            }}
          >
            <p style={{ margin: 0, color: "var(--muted, #6b7280)", fontSize: "14px" }}>{stat.label}</p>
            <h3 style={{ margin: "10px 0 0", fontSize: "24px", fontWeight: 700 }}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="btn"
            style={{
              padding: "10px 16px",
              borderRadius: "999px",
              border: "1px solid var(--border, #e5e7eb)",
              background: activeTab === tab ? "var(--primary, #0d9488)" : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-main, #1f2937)",
              fontWeight: 600,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Pending" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {pending.map((request) => (
            <PendingRequestCard
              key={request.id}
              request={request}
              onCancel={async () => {
                try {
                  await cancelBooking(request.id);
                } catch (err) {
                  window.alert(err.message || "Failed to cancel booking.");
                }
              }}
              onMessageOwner={handleComingSoon}
            />
          ))}
        </div>
      )}

      {activeTab === "Active Rentals" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {activeRentals.map((rental) => {
            if (rental.status === BOOKING_STATUS.approved) {
              return (
                <UpcomingRentalCard
                  key={rental.id}
                  rental={rental}
                  onCancel={async () => {
                    try {
                      await cancelBooking(rental.id);
                    } catch (err) {
                      window.alert(err.message || "Failed to cancel booking.");
                    }
                  }}
                  onChat={handleComingSoon}
                />
              );
            }

            const isItemGiven = rental.status === BOOKING_STATUS.itemGiven;
            const isOngoing = rental.status === BOOKING_STATUS.ongoing;
            const isReturnPending = rental.status === BOOKING_STATUS.returnPending;
            const primaryActionLabel = isItemGiven
              ? "Confirm Item Received"
              : isOngoing
                ? "Request Return"
                : "Return Requested";

            return (
              <BorrowedItemCard
                key={rental.id}
                rental={rental}
                primaryActionLabel={primaryActionLabel}
                primaryActionDisabled={isReturnPending}
                lifecycleNote={isReturnPending ? "Waiting for owner to confirm return." : ""}
                onPrimaryAction={async () => {
                  try {
                    if (isItemGiven) {
                      await confirmItemReceived(rental.id);
                    } else if (isOngoing) {
                      await requestReturn(rental.id);
                    }
                  } catch (err) {
                    window.alert(err.message || "Failed to update booking status.");
                  }
                }}
                onReportIssue={handleComingSoon}
                onChat={handleComingSoon}
              />
            );
          })}
        </div>
      )}

      {activeTab === "History" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {history.map((rental) => (
            <CompletedRentalCard key={rental.id} rental={rental} onRateOwner={handleComingSoon} />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyBookings;
