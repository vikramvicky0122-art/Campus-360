import { describe, it, expect } from 'vitest';
import { checkAvailability } from '../../utils/bookingUtils';

describe('checkAvailability', () => {
  const existingBookings = [
    { start: '2026-04-10', end: '2026-04-15' },
    { start: '2026-04-20', end: '2026-04-25' },
  ];

  it('returns available when no bookings exist', () => {
    const result = checkAvailability('2026-05-01', '2026-05-05', []);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it('returns available when no start/end provided', () => {
    const result = checkAvailability('', '', existingBookings);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it('returns available when dates are before any booking', () => {
    const result = checkAvailability('2026-04-01', '2026-04-05', existingBookings);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it('returns available when dates are after all bookings', () => {
    const result = checkAvailability('2026-05-01', '2026-05-10', existingBookings);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it('returns available during gap between bookings', () => {
    const result = checkAvailability('2026-04-16', '2026-04-18', existingBookings);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });

  it('detects overlap when selected range starts inside a booking', () => {
    const result = checkAvailability('2026-04-12', '2026-04-18', existingBookings);
    expect(result.isAvailable).toBe(false);
    expect(result.conflict).toEqual(existingBookings[0]);
  });

  it('detects overlap when selected range ends inside a booking', () => {
    const result = checkAvailability('2026-04-08', '2026-04-12', existingBookings);
    expect(result.isAvailable).toBe(false);
    expect(result.conflict).toEqual(existingBookings[0]);
  });

  it('detects overlap when selected range fully contains a booking', () => {
    const result = checkAvailability('2026-04-08', '2026-04-18', existingBookings);
    expect(result.isAvailable).toBe(false);
    expect(result.conflict).toEqual(existingBookings[0]);
  });

  it('detects overlap with exact date boundary (inclusive)', () => {
    const result = checkAvailability('2026-04-15', '2026-04-18', existingBookings);
    expect(result.isAvailable).toBe(false);
    expect(result.conflict).toEqual(existingBookings[0]);
  });

  it('handles single-day booking overlap', () => {
    const singleDay = [{ start: '2026-04-15', end: '2026-04-15' }];
    const result = checkAvailability('2026-04-15', '2026-04-15', singleDay);
    expect(result.isAvailable).toBe(false);
  });

  it('handles booking with invalid date fields gracefully', () => {
    const badBooking = [{ start: null, end: undefined }];
    const result = checkAvailability('2026-04-10', '2026-04-12', badBooking);
    expect(result.isAvailable).toBe(true);
    expect(result.conflict).toBeNull();
  });
});
