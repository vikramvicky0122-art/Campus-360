-- Campus 360 — Payment Ledger Migration
-- Adds: PaymentStatus enum, PayoutStatus enum,
--       RentalTransaction model, PayoutRecord model, PaymentWebhookEvent model
-- Also adds: User.payoutsOwned relation (no column, just FK from PayoutRecord)
--            Booking.transaction relation (no column, just FK from RentalTransaction)

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM (
  'pending',
  'mock_paid',
  'youpi_initiated',
  'youpi_observed',
  'confirmed',
  'cancelled',
  'refunded_partial',
  'refunded_full'
);

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateTable: RentalTransaction (commission ledger, one per booking)
CREATE TABLE "RentalTransaction" (
    "id"                     TEXT NOT NULL,
    "bookingId"              TEXT NOT NULL,
    "grossRentalAmountPaise" INTEGER NOT NULL,
    "securityDepositPaise"   INTEGER NOT NULL,
    "commissionRateBps"      INTEGER NOT NULL DEFAULT 500,
    "commissionPaise"        INTEGER NOT NULL,
    "ownerNetPaise"          INTEGER NOT NULL,
    "refundedAmountPaise"    INTEGER NOT NULL DEFAULT 0,
    "refundNote"             TEXT,
    "paymentStatus"          "PaymentStatus" NOT NULL DEFAULT 'pending',
    "youpiPaymentId"         TEXT,
    "youpiOrderId"           TEXT,
    "youpiCheckoutUrl"       TEXT,
    "youpiRawStatus"         TEXT,
    "youpiUtr"               TEXT,
    "notes"                  TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PayoutRecord (admin-managed owner payouts)
CREATE TABLE "PayoutRecord" (
    "id"            TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ownerId"       TEXT NOT NULL,
    "amountPaise"   INTEGER NOT NULL,
    "status"        "PayoutStatus" NOT NULL DEFAULT 'pending',
    "method"        TEXT,
    "reference"     TEXT,
    "paidAt"        TIMESTAMP(3),
    "adminNote"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentWebhookEvent (idempotency log for YouPI-PG webhooks)
CREATE TABLE "PaymentWebhookEvent" (
    "id"             TEXT NOT NULL,
    "youpiPaymentId" TEXT NOT NULL,
    "event"          TEXT NOT NULL,
    "deliveryId"     TEXT,
    "payloadHash"    TEXT NOT NULL,
    "processedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: RentalTransaction
CREATE UNIQUE INDEX "RentalTransaction_bookingId_key" ON "RentalTransaction"("bookingId");
CREATE INDEX "RentalTransaction_bookingId_idx" ON "RentalTransaction"("bookingId");
CREATE INDEX "RentalTransaction_paymentStatus_idx" ON "RentalTransaction"("paymentStatus");
CREATE INDEX "RentalTransaction_youpiPaymentId_idx" ON "RentalTransaction"("youpiPaymentId");

-- CreateIndex: PayoutRecord
CREATE UNIQUE INDEX "PayoutRecord_transactionId_key" ON "PayoutRecord"("transactionId");
CREATE INDEX "PayoutRecord_ownerId_idx" ON "PayoutRecord"("ownerId");
CREATE INDEX "PayoutRecord_status_idx" ON "PayoutRecord"("status");

-- CreateIndex: PaymentWebhookEvent (idempotency — prevents duplicate event processing)
CREATE UNIQUE INDEX "PaymentWebhookEvent_youpiPaymentId_event_key"
    ON "PaymentWebhookEvent"("youpiPaymentId", "event");
CREATE INDEX "PaymentWebhookEvent_youpiPaymentId_idx" ON "PaymentWebhookEvent"("youpiPaymentId");

-- AddForeignKey: RentalTransaction -> Booking
ALTER TABLE "RentalTransaction"
    ADD CONSTRAINT "RentalTransaction_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PayoutRecord -> RentalTransaction
ALTER TABLE "PayoutRecord"
    ADD CONSTRAINT "PayoutRecord_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "RentalTransaction"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PayoutRecord -> User (owner)
ALTER TABLE "PayoutRecord"
    ADD CONSTRAINT "PayoutRecord_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

