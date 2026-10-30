/**
 * Checks if a selected date range overlaps with any existing bookings.
 * Overlap logic: (start1 <= end2) && (start2 <= end1)
 *
 * @param {string} selectedStart - "YYYY-MM-DD"
 * @param {string} selectedEnd - "YYYY-MM-DD"
 * @param {Array} existingBookings - [{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }]
 * @returns { { isAvailable: boolean, conflict: object | null } }
 */
export function checkAvailability(selectedStart, selectedEnd, existingBookings = []) {
  if (!selectedStart || !selectedEnd || existingBookings.length === 0) {
    return { isAvailable: true, conflict: null };
  }

  const s1 = new Date(selectedStart);
  s1.setHours(0, 0, 0, 0);
  
  const e1 = new Date(selectedEnd);
  e1.setHours(0, 0, 0, 0);

  for (const booking of existingBookings) {
    if (!booking.start || !booking.end) continue;

    const s2 = new Date(booking.start);
    s2.setHours(0, 0, 0, 0);

    const e2 = new Date(booking.end);
    e2.setHours(0, 0, 0, 0);

    // Two date intervals [start1, end1] and [start2, end2] overlap if:
    // start1 <= end2 AND start2 <= end1
    if (s1 <= e2 && s2 <= e1) {
      return { isAvailable: false, conflict: booking };
    }
  }

  return { isAvailable: true, conflict: null };
}
