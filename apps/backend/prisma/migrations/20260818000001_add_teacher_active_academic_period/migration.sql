-- AlterTable: Add active_academic_year and active_academic_term to teacher_profiles
ALTER TABLE "teacher_profiles"
    ADD COLUMN IF NOT EXISTS "active_academic_year" VARCHAR(30) DEFAULT '2025-2026',
    ADD COLUMN IF NOT EXISTS "active_academic_term" VARCHAR(30) DEFAULT 'FIRST_TERM';
