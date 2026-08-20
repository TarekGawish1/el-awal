-- Drop obsolete activation-code self-registration fields.
-- The activation-code workflow (studentCode + one-time activation code) was
-- replaced by self-service registration from scratch, so these columns are no
-- longer referenced by any code path.
ALTER TABLE "student_profiles"
    DROP COLUMN IF EXISTS "registration_code_hash",
    DROP COLUMN IF EXISTS "account_claimed_at";
