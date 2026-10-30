/**
 * Campus 360 — Commission Calculation Utility
 *
 * Rules:
 *  - Commission is 5% of the gross rental amount (excludes security deposit).
 *  - All amounts are stored and calculated as integer paise (1 INR = 100 paise)
 *    to avoid floating-point errors.
 *  - The commission rate is stored alongside each record (commissionRateBps)
 *    so historical records remain correct if the rate ever changes.
 *  - Never trust client-submitted amounts — always recalculate server-side.
 *
 * Basis Points (BPS):
 *  - 1 BPS = 0.01%  =>  100 BPS = 1%  =>  500 BPS = 5%
 *  - commission = floor(grossPaise × bps / 10000)
 */

/** Campus 360 default commission rate: 5.00% = 500 BPS */
export const CAMPUS360_COMMISSION_BPS = 500;

/**
 * Convert an INR float to integer paise (round half-up to avoid systematic bias).
 * @param {number} inr - Amount in Indian Rupees (e.g. 1000.50)
 * @returns {number} Integer paise
 */
export function toPaise(inr) {
  if (typeof inr !== 'number' || !Number.isFinite(inr) || inr < 0) {
    throw new Error(`toPaise: invalid input "${inr}"`);
  }
  return Math.round(inr * 100);
}

/**
 * Convert integer paise back to INR (for display only, not for storage).
 * @param {number} paise
 * @returns {number}
 */
export function fromPaise(paise) {
  return paise / 100;
}

/**
 * Format paise as a human-readable INR string.
 * @param {number} paise
 * @returns {string} e.g. "₹1,050.00"
 */
export function formatPaise(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
    fromPaise(paise)
  );
}

/**
 * Calculate the Campus 360 commission breakdown for a booking.
 *
 * @param {{
 *   dailyRentalRate: number,  // INR per day (from listing snapshot)
 *   securityDeposit: number,  // INR (excluded from commission base)
 *   rentalDays: number,        // number of rental days
 *   commissionBps?: number     // override if needed; defaults to CAMPUS360_COMMISSION_BPS
 * }} params
 * @returns {{
 *   grossRentalAmountPaise: number,
 *   securityDepositPaise: number,
 *   commissionRateBps: number,
 *   commissionPaise: number,
 *   ownerNetPaise: number
 * }}
 */
export function calculateCommission({
  dailyRentalRate,
  securityDeposit,
  rentalDays,
  commissionBps = CAMPUS360_COMMISSION_BPS,
}) {
  if (!Number.isFinite(dailyRentalRate) || dailyRentalRate < 0) {
    throw new Error('calculateCommission: dailyRentalRate must be a non-negative number');
  }
  if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
    throw new Error('calculateCommission: securityDeposit must be a non-negative number');
  }
  if (!Number.isInteger(rentalDays) || rentalDays < 1) {
    throw new Error('calculateCommission: rentalDays must be a positive integer');
  }
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10000) {
    throw new Error('calculateCommission: commissionBps must be an integer between 0 and 10000');
  }

  const grossRentalAmountPaise = toPaise(dailyRentalRate * rentalDays);
  const securityDepositPaise   = toPaise(securityDeposit);

  // Integer arithmetic: floor to avoid over-charging
  const commissionPaise = Math.floor((grossRentalAmountPaise * commissionBps) / 10000);
  const ownerNetPaise   = grossRentalAmountPaise - commissionPaise;

  return {
    grossRentalAmountPaise,
    securityDepositPaise,
    commissionRateBps: commissionBps,
    commissionPaise,
    ownerNetPaise,
  };
}

/**
 * Calculate the number of rental days between two dates (inclusive of start, exclusive of end).
 * Minimum 1 day.
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {number}
 */
export function rentalDaysBetween(startDate, endDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diffMs / msPerDay));
}

/**
 * Apply a refund adjustment to an existing transaction's paise amounts.
 * Returns adjusted ownerNetPaise and commissionPaise based on pro-rata refund.
 *
 * Rules:
 *  - Campus 360 absorbs the commission portion of any platform-driven cancellation.
 *  - For now (no YouPI refund API), we record the refund in the ledger only.
 *  - isFullRefund: ownerNetPaise → 0, commissionPaise → 0
 *  - isPartial: deduct refundPaise from grossRentalAmountPaise, recalculate
 *
 * @param {{
 *   grossRentalAmountPaise: number,
 *   commissionRateBps: number,
 *   refundAmountPaise: number
 * }} params
 * @returns {{ adjustedOwnerNetPaise: number, adjustedCommissionPaise: number }}
 */
export function applyRefundToCommission({ grossRentalAmountPaise, commissionRateBps, refundAmountPaise }) {
  if (refundAmountPaise <= 0) {
    throw new Error('applyRefundToCommission: refundAmountPaise must be > 0');
  }
  const clampedRefund = Math.min(refundAmountPaise, grossRentalAmountPaise);
  const remainingGross = grossRentalAmountPaise - clampedRefund;

  const adjustedCommissionPaise = Math.floor((remainingGross * commissionRateBps) / 10000);
  const adjustedOwnerNetPaise   = remainingGross - adjustedCommissionPaise;

  return { adjustedOwnerNetPaise, adjustedCommissionPaise };
}
