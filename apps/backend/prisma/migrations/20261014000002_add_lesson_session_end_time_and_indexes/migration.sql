-- Safe migration: Add end_time column to lesson_sessions (replacing runtime DDL in PrismaService)
ALTER TABLE "lesson_sessions" ADD COLUMN IF NOT EXISTS "end_time" VARCHAR(10);

-- Drop redundant duplicate index on student_profiles.qr_code_token (already enforced by uq_student_qr_code)
DROP INDEX IF EXISTS "idx_students_qr_code";

-- Add performance indexes for financial lookups and offline sync on student_payment_records
CREATE INDEX IF NOT EXISTS "idx_payments_group_status" ON "student_payment_records"("group_id", "payment_status");
CREATE INDEX IF NOT EXISTS "idx_payments_period" ON "student_payment_records"("period_year", "period_month");

-- Index for tuition billing periods
-- Deployment prerequisite for UNIQUE constraint: Ensure zero duplicates exist before promoting:
--   SELECT student_id, group_id, period_year, period_month, COUNT(*) FROM student_payment_records WHERE payment_type = 'TUITION' GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;
CREATE INDEX IF NOT EXISTS "idx_tuition_payment_period" ON "student_payment_records"("student_id", "group_id", "period_year", "period_month") WHERE "payment_type" = 'TUITION';

-- Index for keyset pagination and filtering on student_profiles
CREATE INDEX IF NOT EXISTS "idx_students_status_created" ON "student_profiles"("academic_status", "created_at" DESC);
