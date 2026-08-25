-- AlterTable: Add homework submission file tracking and session linkage
ALTER TABLE "assessment_submissions"
    ADD COLUMN IF NOT EXISTS "file_key" VARCHAR(500),
    ADD COLUMN IF NOT EXISTS "session_id" UUID,
    ADD COLUMN IF NOT EXISTS "student_notes" TEXT;

CREATE INDEX IF NOT EXISTS "idx_submissions_session"
    ON "assessment_submissions"("session_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assessment_submissions_session_id_fkey'
  ) THEN
    ALTER TABLE "assessment_submissions"
      ADD CONSTRAINT "assessment_submissions_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "lesson_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
