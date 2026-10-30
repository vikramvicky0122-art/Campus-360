import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard.jsx";
import ApprovalCard from "../components/ApprovalCard.jsx";
import RentalHistoryCard from "../components/RentalHistoryCard.jsx";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import { useBookings } from "../context/BookingContext.jsx";
import { useListings } from "../context/ListingContext.jsx";

const tabs = ["Active Listings", "Pending Approvals", "Rental History"];

const formatShortDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" }).format(date);
};

const formatRange = (start, end) => {
  if (!start && !end) return "";
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
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

function MyListings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const { myListings, toggleHidden, deleteListing } = useListings();
  const { bookings, approveBooking, rejectBooking, cancelBooking, markItemGiven, confirmReturn } = useBookings();

  const formattedListings = useMemo(() => {
    return myListings.map((item) => {
      const itemBookings = uniqueById(
        bookings.filter((booking) => String(booking.itemId) === String(item.id))
      );
      const active = itemBookings.find((booking) =>
        [BOOKING_STATUS.itemGiven, BOOKING_STATUS.ongoing, BOOKING_STATUS.returnPending].includes(booking.status)
      );
      const upcoming = itemBookings.filter((booking) => booking.status === BOOKING_STATUS.approved);

      upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));

      const nextReservation =
        upcoming.length > 0
          ? {
              dates: formatRange(upcoming[0].start, upcoming[0].end),
              renter: upcoming[0].requester || "Student",
            }
          : null;

      const status = active ? "Rented" : "Available";

      return {
        id: item.id,
        name: item.title,
        price: `Rs ${item.pricePerDay}`,
        status,
        isHidden: item.isHidden,
        image: item.images?.[0] || "teal",
        currentRental: active
          ? {
              id: active.id,
              dates: formatRange(active.start, active.end),
              renter: active.requester || "Student",
              status: active.status
            }
          : null,
        nextReservation,
        upcoming: upcoming.map((booking) => ({
          id: booking.id,
          dates: formatRange(booking.start, booking.end),
          renter: booking.requester || "Student",
          status: booking.status,
        })),
        rawItem: item,
      };
    });
  }, [myListings, bookings]);

  const approvals = useMemo(() => {
    const listingIds = new Set(myListings.map((listing) => String(listing.id)));
    return uniqueById(bookings)
      .filter(
        (booking) =>
          booking.status === BOOKING_STATUS.requested && listingIds.has(String(booking.itemId))
      )
      .map((booking) => {
        const item = myListings.find((listing) => String(listing.id) === String(booking.itemId));
        return {
          id: booking.id,
          title: item?.title || booking.title,
          requester: booking.requester || "Campus 360 User",
          dates: formatRange(booking.start, booking.end),
        };
      });
  }, [bookings, myListings]);

  const history = useMemo(() => {
    const listingIds = new Set(myListings.map((listing) => String(listing.id)));
    return uniqueById(bookings)
      .filter(
        (booking) =>
          [BOOKING_STATUS.completed, BOOKING_STATUS.cancelled, BOOKING_STATUS.rejected].includes(
            booking.status
          ) && listingIds.has(String(booking.itemId))
      )
      .map((booking) => {
        const item = myListings.find((listing) => String(listing.id) === String(booking.itemId));
        const statusLabel =
          booking.status === BOOKING_STATUS.cancelled
            ? "Cancelled"
            : booking.status === BOOKING_STATUS.rejected
              ? "Rejected"
              : "Completed";
        const timelineAt =
          booking.cancelledAt || booking.returnedAt || booking.end || booking.submittedAt || "";

        return {
          id: booking.id,
          item: item?.title || booking.title || "Unspecified Item",
          renter: booking.requester || "Campus 360 User",
          dates: formatRange(booking.start, booking.end),
          total: `Rs ${booking.totalAmount || 0}`,
          statusLabel,
          cancelledBy: booking.cancelledBy || null,
          timelineAt,
        };
      })
      .sort((a, b) => new Date(b.timelineAt) - new Date(a.timelineAt));
  }, [bookings, myListings]);

  const handleEditListing = (item) => {
    navigate(`/add?edit=${item.id}`);
  };

  const handleToggleHidden = (item) => {
    toggleHidden(item.id);
  };

  const handleDeleteListing = async (item) => {
    try {
      await deleteListing(item.id);
    } catch (err) {
      window.alert(err.message || "Failed to delete listing.");
    }
  };

  const handleApprove = async (approval) => {
    try {
      await approveBooking(approval.id);
    } catch (err) {
      window.alert(err.message || "Failed to approve booking.");
    }
  };

  const handleReject = async (approval) => {
    try {
      await rejectBooking(approval.id);
    } catch (err) {
      window.alert(err.message || "Failed to reject booking.");
    }
  };

  const handleConfirmReturn = async (item) => {
    const activeBooking = bookings.find((booking) => String(booking.id) === String(item.currentRental?.id));
    if (activeBooking) {
      try {
        await confirmReturn(activeBooking.id);
      } catch (err) {
        window.alert(err.message || "Failed to confirm return.");
      }
    }
  };

  const handleMarkItemGiven = async (bookingId) => {
    try {
      await markItemGiven(bookingId);
    } catch (err) {
      window.alert(err.message || "Failed to mark item as given.");
    }
  };

  const handleCancelUpcoming = async (bookingId) => {
    try {
      await cancelBooking(bookingId);
    } catch (err) {
      window.alert(err.message || "Failed to cancel booking.");
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "32px", fontFamily: '"Space Grotesk", sans-serif', marginBottom: "8px" }}>
          My Gear Closet
        </h1>
        <p style={{ color: "var(--muted, #6b7280)" }}>
          Track your listings, approvals, and rental performance in one place.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {[
          { label: "Active Listings", value: String(myListings.filter(l => !l.isHidden).length) },
          { label: "Pending Approvals", value: String(approvals.length) },
          { label: "History Records", value: String(history.length) },
        ].map((stat) => (
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

      {activeTab === "Active Listings" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {formattedListings.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              onEdit={handleEditListing}
              onToggleHidden={handleToggleHidden}
              onDelete={handleDeleteListing}
              onConfirmReturn={handleConfirmReturn}
              onMarkItemGiven={handleMarkItemGiven}
              onCancelUpcoming={handleCancelUpcoming}
            />
          ))}
        </div>
      )}

      {activeTab === "Pending Approvals" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {activeTab === "Rental History" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {history.map((rental) => (
            <RentalHistoryCard key={rental.id} rental={rental} />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyListings;
