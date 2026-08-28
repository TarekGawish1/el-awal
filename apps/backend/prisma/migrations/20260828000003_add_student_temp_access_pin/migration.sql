
-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "temp_access_pin" VARCHAR(6),
ADD COLUMN     "pin_expires_at" TIMESTAMPTZ(6);
