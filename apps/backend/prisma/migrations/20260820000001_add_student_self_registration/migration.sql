-- AlterTable: Add student self-registration claim tracking columns to student_profiles
ALTER TABLE "student_profiles"
    ADD COLUMN IF NOT EXISTS "registration_code_hash" VARCHAR(128),
    ADD COLUMN IF NOT EXISTS "account_claimed_at" TIMESTAMPTZ(6);

-- DataBackfill: All students that existed before self-registration was introduced
-- were fully provisioned by the administration (User + credentials), so their
-- accounts are considered already claimed and are rejected from self-registration.
UPDATE "student_profiles"
SET "account_claimed_at" = COALESCE("created_at", NOW())
WHERE "account_claimed_at" IS NULL;
