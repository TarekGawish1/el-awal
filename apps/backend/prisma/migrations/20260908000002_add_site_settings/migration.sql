-- Create site_settings key/value store for landing-page display controls
CREATE TABLE "site_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(100) NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");
