-- CreateEnum
CREATE TYPE "homework_delivery_type" AS ENUM ('ONLINE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "homework_submission_status" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED_ONLINE', 'CHECKED_ONSITE', 'EXCUSED');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "homework_delivery_type" "homework_delivery_type" NOT NULL DEFAULT 'ONSITE';

-- CreateTable
CREATE TABLE "homework_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "homework_submission_status" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "checked_by_role" "user_role" NOT NULL DEFAULT 'TEACHER',
    "recorded_method" "recording_method" NOT NULL DEFAULT 'QR_SCAN',
    "score" DECIMAL(6,2),
    "feedback" TEXT,
    "client_timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_homework_records_assessment_student_session" ON "homework_records"("assessment_id", "student_id", "session_id");

-- CreateIndex
CREATE INDEX "idx_homework_records_session_student" ON "homework_records"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "idx_homework_records_student" ON "homework_records"("student_id");

-- AddForeignKey
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework_records" ADD CONSTRAINT "homework_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "lesson_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
