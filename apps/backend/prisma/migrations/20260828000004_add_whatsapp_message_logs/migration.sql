-- Persistent, rate-limited WhatsApp dispatch and delivery audit log
CREATE TYPE "whatsapp_status" AS ENUM (
  'QUEUED',
  'SENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'PERMANENT_FAIL'
);

CREATE TABLE "whatsapp_message_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipient_phone" VARCHAR(30) NOT NULL,
  "recipient_name" VARCHAR(200),
  "recipient_role" "user_role" NOT NULL DEFAULT 'PARENT',
  "template_type" VARCHAR(100) NOT NULL,
  "message_body" TEXT NOT NULL,
  "status" "whatsapp_status" NOT NULL DEFAULT 'QUEUED',
  "provider_message_id" VARCHAR(255),
  "failure_reason" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "max_retries" INTEGER NOT NULL DEFAULT 3,
  "scheduled_for" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMPTZ(6),
  "delivered_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_whatsapp_message_logs_queue"
  ON "whatsapp_message_logs"("status", "scheduled_for");
CREATE INDEX "idx_whatsapp_message_logs_recipient_phone"
  ON "whatsapp_message_logs"("recipient_phone");
CREATE INDEX "idx_whatsapp_message_logs_created_at"
  ON "whatsapp_message_logs"("created_at");
