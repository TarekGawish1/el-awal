CREATE TABLE IF NOT EXISTS "teacher_billing_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "academic_year" VARCHAR(30) NOT NULL,
    "academic_term" VARCHAR(30) NOT NULL,
    "excluded_months" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "teacher_billing_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_teacher_billing_period"
    ON "teacher_billing_configurations"("teacher_id", "academic_year", "academic_term");

CREATE INDEX IF NOT EXISTS "idx_teacher_billing_config_teacher"
    ON "teacher_billing_configurations"("teacher_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'teacher_billing_configurations_teacher_id_fkey'
  ) THEN
    ALTER TABLE "teacher_billing_configurations"
      ADD CONSTRAINT "teacher_billing_configurations_teacher_id_fkey"
      FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
