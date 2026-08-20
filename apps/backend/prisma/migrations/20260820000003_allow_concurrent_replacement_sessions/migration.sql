-- Drop the unique constraint to allow cancelled sessions and replacement sessions to coexist
ALTER TABLE "lesson_sessions" DROP CONSTRAINT IF EXISTS "uq_group_session_datetime";

-- Add non-unique index for performance
CREATE INDEX IF NOT EXISTS "idx_group_session_datetime" ON "lesson_sessions"("group_id", "session_date", "start_time");
