-- AlterTable
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "push_error" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "push_retry_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_notifications_push_queue" ON "notifications"("push_status", "scheduled_for");
