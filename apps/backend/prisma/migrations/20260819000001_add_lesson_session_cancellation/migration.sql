-- AlterTable: Add is_cancelled and cancellation_reason to lesson_sessions
ALTER TABLE "lesson_sessions"
    ADD COLUMN IF NOT EXISTS "is_cancelled" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT;
