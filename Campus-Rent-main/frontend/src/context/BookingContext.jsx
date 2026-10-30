/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BOOKING_STATUS } from "../constants/bookingStatus.js";
import { api } from "../services/api.js";
import { useAuth } from "./AuthContext.jsx";

const BookingContext = createContext(null);

const normalizeList = (items) => (Array.isArray(items) ? items : []);

const dedupeBookings = (items) => {
  const byId = new Map();
  normalizeList(items).forEach((booking) => {
    const key = String(booking?.id || "");
    if (!key) return;
    byId.set(key, booking);
  });
  return Array.from(byId.values());
};

export function BookingProvider({ children }) {
  const { user } = useAuth();
  const [bookings, setRawBookings] = useState([]);

  const refreshBookings = useCallback(async (signal) => {
    if (!user) {
      setRawBookings([]);
      return;
    }

    try {
      const res = await api.getMyBookings(signal);
      if (res.success && res.data) {
        const mapBooking = (b) => ({
          id: String(b.id),
          itemId: String(b.listingId),
          title: b.listing?.title || "Item",
          image: b.listing?.images?.[0]?.imageUrl || "teal",
          start: b.startDate,
          end: b.endDate,
          requester: b.borrower?.fullName || "Student",
          submittedAt: b.createdAt,
          rentalAmount: b.totalPriceSnapshot,
          depositAmount: b.securityDepositSnapshot,
          totalAmount: (b.totalPriceSnapshot || 0) + (b.securityDepositSnapshot || 0),
          status: b.status,
          cancelledBy: b.cancelledBy?.fullName || null,
          cancelledAt: b.cancelledAt,
          returnedAt: b.returnedAt
        });

        const borrowings = (res.data.borrowings || []).map(mapBooking);
        const lending = (res.data.lending || []).map(mapBooking);

        setRawBookings([...borrowings, ...lending]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Booking API sync failed.", err);
      }
    }
  }, [user]);

  // Fetch live backend data to synchronize BookingContext
  useEffect(() => {
    const controller = new AbortController();
    refreshBookings(controller.signal);
    return () => controller.abort();
  }, [refreshBookings]);

  const setBookings = useCallback((nextOrUpdater) => {
    setRawBookings((prev) => {
      const next =
        typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
      return dedupeBookings(next);
    });
  }, []);

  const approveBooking = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.approved);
    await refreshBookings();
  }, [refreshBookings]);

  const rejectBooking = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.rejected);
    await refreshBookings();
  }, [refreshBookings]);

  const cancelBooking = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.cancelled);
    await refreshBookings();
  }, [refreshBookings]);

  const markItemGiven = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.itemGiven);
    await refreshBookings();
  }, [refreshBookings]);

  const confirmItemReceived = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.ongoing);
    await refreshBookings();
  }, [refreshBookings]);

  const requestReturn = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.returnPending);
    await refreshBookings();
  }, [refreshBookings]);

  const confirmReturn = useCallback(async (id) => {
    await api.updateBookingStatus(id, BOOKING_STATUS.completed);
    await refreshBookings();
  }, [refreshBookings]);

  const value = useMemo(
    () => ({
      bookings,
      approveBooking,
      rejectBooking,
      cancelBooking,
      markItemGiven,
      confirmItemReceived,
      requestReturn,
      confirmReturn,
      setBookings,
      refreshBookings,
    }),
    [bookings, approveBooking, rejectBooking, cancelBooking, markItemGiven, confirmItemReceived, requestReturn, confirmReturn, setBookings, refreshBookings]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBookings must be used within a BookingProvider");
  }
  return context;
}
