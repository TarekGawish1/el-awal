-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "payment_type" AS ENUM ('TUITION', 'BOOKLET', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "student_payment_records" 
    ADD COLUMN IF NOT EXISTS "payment_type" "payment_type" NOT NULL DEFAULT 'TUITION',
    ADD COLUMN IF NOT EXISTS "booklet_id" UUID;

-- DropIndex (if exists)
DROP INDEX IF EXISTS "uq_student_group_billing_period";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_student_group_billing_period" ON "student_payment_records"("student_id", "group_id", "period_year", "period_month");
CREATE INDEX IF NOT EXISTS "idx_payments_booklet" ON "student_payment_records"("booklet_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "booklets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "grade_level" VARCHAR(50) NOT NULL,
    "group_id" UUID,
    "teacher_profile_id" UUID NOT NULL,
    "academic_year" VARCHAR(30) DEFAULT '2026-2027',
    "academic_term" VARCHAR(30) DEFAULT 'FIRST_TERM',
    "stock_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "booklets_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes on booklets
CREATE INDEX IF NOT EXISTS "idx_booklets_teacher_grade" ON "booklets"("teacher_profile_id", "grade_level");
CREATE INDEX IF NOT EXISTS "idx_booklets_group" ON "booklets"("group_id");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "booklets" ADD CONSTRAINT "booklets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "booklets" ADD CONSTRAINT "booklets_teacher_profile_id_fkey" FOREIGN KEY ("teacher_profile_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "student_payment_records" ADD CONSTRAINT "student_payment_records_booklet_id_fkey" FOREIGN KEY ("booklet_id") REFERENCES "booklets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
