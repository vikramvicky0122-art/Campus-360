/**
 * Campus 360 — Commission Calculation Tests
 * Tests run without a database (pure utility functions).
 */

import { describe, it, expect } from 'vitest';
import {
  toPaise,
  fromPaise,
  formatPaise,
  calculateCommission,
  rentalDaysBetween,
  applyRefundToCommission,
  CAMPUS360_COMMISSION_BPS,
} from '../src/utils/commission.js';

// ─── toPaise ──────────────────────────────────────────────────────────────────

describe('toPaise', () => {
  it('converts whole rupees to paise', () => {
    expect(toPaise(1000)).toBe(100000);
    expect(toPaise(0)).toBe(0);
  });

  it('rounds half-up for fractional paise', () => {
    expect(toPaise(10.005)).toBe(1001);
    expect(toPaise(10.004)).toBe(1000);
  });

  it('throws on negative input', () => {
    expect(() => toPaise(-1)).toThrow();
  });

  it('throws on non-numeric input', () => {
    expect(() => toPaise('abc')).toThrow();
    expect(() => toPaise(NaN)).toThrow();
    expect(() => toPaise(Infinity)).toThrow();
  });
});

// ─── fromPaise ────────────────────────────────────────────────────────────────

describe('fromPaise', () => {
  it('converts paise to rupees', () => {
    expect(fromPaise(100000)).toBe(1000);
    expect(fromPaise(50)).toBe(0.5);
  });
});

// ─── formatPaise ─────────────────────────────────────────────────────────────

describe('formatPaise', () => {
  it('formats paise as INR currency string', () => {
    const result = formatPaise(100000);
    expect(result).toContain('1,000');
  });
});

// ─── calculateCommission ─────────────────────────────────────────────────────

describe('calculateCommission', () => {
  it('calculates 5% commission correctly for ₹1000 rental', () => {
    const result = calculateCommission({
      dailyRentalRate: 1000,
      securityDeposit: 500,
      rentalDays: 1,
    });
    expect(result.grossRentalAmountPaise).toBe(100000); // ₹1000 = 100000 paise
    expect(result.securityDepositPaise).toBe(50000);    // ₹500 = 50000 paise
    expect(result.commissionRateBps).toBe(500);          // 5%
    expect(result.commissionPaise).toBe(5000);           // ₹50 commission
    expect(result.ownerNetPaise).toBe(95000);            // ₹950 owner net
  });

  it('excludes security deposit from commission base', () => {
    const result = calculateCommission({
      dailyRentalRate: 100,
      securityDeposit: 10000, // Large deposit should not affect commission
      rentalDays: 1,
    });
    expect(result.grossRentalAmountPaise).toBe(10000); // Only ₹100 rental
    expect(result.commissionPaise).toBe(500);           // 5% of ₹100 = ₹5
    expect(result.ownerNetPaise).toBe(9500);            // ₹95
  });

  it('calculates correctly for multi-day rentals', () => {
    const result = calculateCommission({
      dailyRentalRate: 200,
      securityDeposit: 0,
      rentalDays: 5,
    });
    expect(result.grossRentalAmountPaise).toBe(100000); // ₹200 × 5 = ₹1000
    expect(result.commissionPaise).toBe(5000);           // ₹50
    expect(result.ownerNetPaise).toBe(95000);            // ₹950
  });

  it('uses floor for commission to avoid over-charging', () => {
    // ₹33 × 1 day = 3300 paise; 5% = 165 paise (exact, no rounding needed)
    const result = calculateCommission({
      dailyRentalRate: 33,
      securityDeposit: 0,
      rentalDays: 1,
    });
    expect(result.grossRentalAmountPaise).toBe(3300);
    expect(result.commissionPaise).toBe(165); // floor(3300 * 500 / 10000) = 165
    expect(result.ownerNetPaise).toBe(3135);
  });

  it('handles fractional daily rate', () => {
    // ₹10.50/day × 2 days = ₹21 = 2100 paise; 5% = floor(2100*500/10000) = 105
    const result = calculateCommission({
      dailyRentalRate: 10.50,
      securityDeposit: 0,
      rentalDays: 2,
    });
    expect(result.grossRentalAmountPaise).toBe(2100);
    expect(result.commissionPaise).toBe(105);
    expect(result.ownerNetPaise).toBe(1995);
  });

  it('supports custom commission rate via BPS override', () => {
    const result = calculateCommission({
      dailyRentalRate: 1000,
      securityDeposit: 0,
      rentalDays: 1,
      commissionBps: 1000, // 10%
    });
    expect(result.commissionPaise).toBe(10000);
    expect(result.ownerNetPaise).toBe(90000);
  });

  it('throws on negative daily rate', () => {
    expect(() => calculateCommission({ dailyRentalRate: -10, securityDeposit: 0, rentalDays: 1 })).toThrow();
  });

  it('throws on zero rentalDays', () => {
    expect(() => calculateCommission({ dailyRentalRate: 100, securityDeposit: 0, rentalDays: 0 })).toThrow();
  });

  it('throws on invalid commissionBps', () => {
    expect(() => calculateCommission({ dailyRentalRate: 100, securityDeposit: 0, rentalDays: 1, commissionBps: -1 })).toThrow();
    expect(() => calculateCommission({ dailyRentalRate: 100, securityDeposit: 0, rentalDays: 1, commissionBps: 10001 })).toThrow();
  });

  it('invariant: ownerNet + commission === grossRentalAmount', () => {
    const cases = [
      { dailyRentalRate: 1, securityDeposit: 0, rentalDays: 1 },
      { dailyRentalRate: 999.99, securityDeposit: 200, rentalDays: 30 },
      { dailyRentalRate: 0, securityDeposit: 0, rentalDays: 1 },
    ];
    for (const c of cases) {
      const r = calculateCommission(c);
      expect(r.commissionPaise + r.ownerNetPaise).toBe(r.grossRentalAmountPaise);
    }
  });

  it('uses default CAMPUS360_COMMISSION_BPS if not specified', () => {
    const result = calculateCommission({ dailyRentalRate: 100, securityDeposit: 0, rentalDays: 1 });
    expect(result.commissionRateBps).toBe(CAMPUS360_COMMISSION_BPS);
  });
});

// ─── rentalDaysBetween ───────────────────────────────────────────────────────

describe('rentalDaysBetween', () => {
  it('calculates days correctly', () => {
    const start = new Date('2026-11-01T00:00:00Z');
    const end   = new Date('2026-11-06T00:00:00Z');
    expect(rentalDaysBetween(start, end)).toBe(5);
  });

  it('returns minimum 1 day for same-day dates', () => {
    const date = new Date('2026-11-01T00:00:00Z');
    expect(rentalDaysBetween(date, date)).toBe(1);
  });

  it('returns 1 for end slightly after start within same day', () => {
    const start = new Date('2026-11-01T10:00:00Z');
    const end   = new Date('2026-11-01T18:00:00Z');
    expect(rentalDaysBetween(start, end)).toBe(1);
  });
});

// ─── applyRefundToCommission ─────────────────────────────────────────────────

describe('applyRefundToCommission', () => {
  it('full refund reduces owner net and commission to 0', () => {
    const { adjustedOwnerNetPaise, adjustedCommissionPaise } = applyRefundToCommission({
      grossRentalAmountPaise: 100000,
      commissionRateBps: 500,
      refundAmountPaise: 100000,
    });
    expect(adjustedOwnerNetPaise).toBe(0);
    expect(adjustedCommissionPaise).toBe(0);
  });

  it('partial refund recalculates commission on remaining amount', () => {
    // Gross = 100000 paise (₹1000). Refund 50000 (₹500). Remaining = 50000.
    // New commission = floor(50000 * 500 / 10000) = 2500
    // New owner net = 50000 - 2500 = 47500
    const { adjustedOwnerNetPaise, adjustedCommissionPaise } = applyRefundToCommission({
      grossRentalAmountPaise: 100000,
      commissionRateBps: 500,
      refundAmountPaise: 50000,
    });
    expect(adjustedCommissionPaise).toBe(2500);
    expect(adjustedOwnerNetPaise).toBe(47500);
  });

  it('refund exceeding gross is clamped to gross', () => {
    const { adjustedOwnerNetPaise, adjustedCommissionPaise } = applyRefundToCommission({
      grossRentalAmountPaise: 100000,
      commissionRateBps: 500,
      refundAmountPaise: 999999,
    });
    expect(adjustedOwnerNetPaise).toBe(0);
    expect(adjustedCommissionPaise).toBe(0);
  });

  it('throws on non-positive refundAmountPaise', () => {
    expect(() => applyRefundToCommission({
      grossRentalAmountPaise: 100000,
      commissionRateBps: 500,
      refundAmountPaise: 0,
    })).toThrow();
  });
});
