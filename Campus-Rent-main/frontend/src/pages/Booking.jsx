import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import BookingForm from "../components/BookingForm.jsx";
import PriceBreakdown from "../components/PriceBreakdown.jsx";
import { checkAvailability } from "../utils/bookingUtils.js";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import { useBookings } from "../context/BookingContext.jsx";
import { useListings } from "../context/ListingContext.jsx";
import { api } from "../services/api.js";
import { resolveMediaDisplay } from "../utils/mediaUtils.js";

/* eslint-disable react-hooks/set-state-in-effect */

function Booking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateContext = location.state || {};
  const { listings, isLoading: areListingsLoading } = useListings();

  const item = listings.find((entry) => String(entry.id) === String(id));

  const [startDate, setStartDate] = useState(stateContext.startDate || "");
  const [endDate, setEndDate] = useState(stateContext.endDate || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuardRef = useRef(false);
  const { bookings, refreshBookings } = useBookings();

  useEffect(() => {
    if (!startDate) {
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
    }
  }, [startDate]);

  if (areListingsLoading && !item) {
    return (
      <section
        className="page"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "18px" }}>Loading booking details...</p>
      </section>
    );
  }

  if (!item) {
    return (
      <section
        className="page"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2 style={{ fontSize: "32px", marginBottom: "16px" }}>Item not found</h2>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
          Cannot proceed with booking. This item may have been removed.
        </p>
        <button onClick={() => navigate("/marketplace")} className="btn primary">
          Back to Marketplace
        </button>
      </section>
    );
  }

  const calculateTotalDays = () => {
    if (!startDate || !endDate) return 0;
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 ? diffDays + 1 : 0;
  };

  const validateDates = (start, end) => {
    setError("");
    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      d1.setHours(0, 0, 0, 0);
      d2.setHours(0, 0, 0, 0);
      if (d2 < d1) {
        setError("Return date cannot be before pickup date.");
        return false;
      }

      const activeBookings = bookings.filter(
        (booking) =>
          String(booking.itemId) === String(item.id) &&
          (booking.status === BOOKING_STATUS.approved || booking.status === BOOKING_STATUS.itemGiven || booking.status === BOOKING_STATUS.ongoing || booking.status === BOOKING_STATUS.returnPending)
      );
      const availability = checkAvailability(start, end, activeBookings);
      if (!availability.isAvailable) {
        setError(`Item is already booked from ${availability.conflict.start} to ${availability.conflict.end}.`);
        return false;
      }
    }
    return true;
  };

  const handleStartChange = (val) => {
    setStartDate(val);
    validateDates(val, endDate);
  };

  const handleEndChange = (val) => {
    setEndDate(val);
    validateDates(startDate, val);
  };

  const totalDays = calculateTotalDays();
  const totalItemPrice = totalDays * item.pricePerDay;
  const serviceFee = totalDays > 0 ? 50 : 0;
  const finalTotal = totalItemPrice + serviceFee + (item.securityDeposit || 0);
  const isValid = totalDays > 0 && !error;
  const canSubmit = isValid && !isSubmitting;
  const media = resolveMediaDisplay(item.images?.[0], "purple");

  const handleConfirm = async () => {
    if (!isValid || submitGuardRef.current) return;

    submitGuardRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await api.createBooking({
        listingId: item.id,
        startDate: startDate,
        endDate: endDate,
        pickupZone: item.location || "Default Zone"
      });

      if (response.success) {
        await refreshBookings();
        navigate("/chat", { state: { bookingRef: response.data.id } });
      }
    } catch (err) {
      console.error("Booking failed:", err);
      submitGuardRef.current = false;
      setIsSubmitting(false);

      if (err.status === 409) {
        setError(err.message || "Requested dates overlap with an existing booking.");
      } else {
        setError(err.message || "An unexpected error occurred while booking. Please try again.");
      }
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <section className="page" style={{ paddingTop: "24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--primary)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          <span>â†</span> Back
        </button>
        <h1 style={{ fontSize: "32px", fontFamily: '"Space Grotesk", sans-serif', marginTop: "8px" }}>
          Confirm Your Reservation
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "16px", marginTop: "8px" }}>
          Review the final details before securing this rental.
        </p>
      </div>

      <div
        className="booking-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(300px, 400px) minmax(0, 1fr)",
          gap: "48px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
            position: "sticky",
            top: "100px",
          }}
        >
          <div className={media.className} style={{ ...media.style, aspectRatio: "16/9" }}></div>
          <div style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>{item.title}</h3>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginBottom: "16px",
              }}
            >
              ðŸ“ {item.location}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                background: "var(--bg)",
                borderRadius: "12px",
              }}
            >
              <span style={{ fontWeight: 600 }}>Rate</span>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--primary)" }}>
                â‚¹{item.pricePerDay} <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 400 }}>/ day</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <BookingForm
            startDate={startDate}
            endDate={endDate}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            error={error}
            totalDays={totalDays}
          />
          <PriceBreakdown
            totalDays={totalDays}
            pricePerDay={item.pricePerDay}
            securityDeposit={item.securityDeposit}
            serviceFee={serviceFee}
            finalTotal={finalTotal}
            isValid={canSubmit}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            primaryText={isSubmitting ? "Submitting..." : "Confirm Booking"}
          />
        </div>
      </div>
    </section>
  );
}

export default Booking;

