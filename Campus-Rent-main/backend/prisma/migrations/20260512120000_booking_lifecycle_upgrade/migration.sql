ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";

CREATE TYPE "BookingStatus" AS ENUM (
  'requested',
  'approved',
  'item_given',
  'ongoing',
  'return_pending',
  'completed',
  'rejected',
  'cancelled'
);

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Booking"
ALTER COLUMN "status" TYPE "BookingStatus"
USING (
  CASE "status"::text
    WHEN 'pending' THEN 'requested'
    WHEN 'upcoming' THEN 'approved'
    WHEN 'ongoing' THEN 'ongoing'
    WHEN 'completed' THEN 'completed'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'requested'
  END
)::"BookingStatus";

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'requested';

DROP TYPE "BookingStatus_old";
