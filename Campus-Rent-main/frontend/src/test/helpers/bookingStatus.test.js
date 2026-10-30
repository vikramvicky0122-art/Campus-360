import { describe, it, expect } from 'vitest';
import { BOOKING_STATUS } from '../../constants/bookingStatus';

describe('BOOKING_STATUS', () => {
  it('contains all required lifecycle statuses', () => {
    expect(BOOKING_STATUS.requested).toBe('requested');
    expect(BOOKING_STATUS.approved).toBe('approved');
    expect(BOOKING_STATUS.itemGiven).toBe('item_given');
    expect(BOOKING_STATUS.ongoing).toBe('ongoing');
    expect(BOOKING_STATUS.returnPending).toBe('return_pending');
    expect(BOOKING_STATUS.completed).toBe('completed');
    expect(BOOKING_STATUS.cancelled).toBe('cancelled');
    expect(BOOKING_STATUS.rejected).toBe('rejected');
  });

  it('has exactly 8 status values', () => {
    expect(Object.keys(BOOKING_STATUS).length).toBe(8);
  });

  it('all statuses are unique strings', () => {
    const values = Object.values(BOOKING_STATUS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
