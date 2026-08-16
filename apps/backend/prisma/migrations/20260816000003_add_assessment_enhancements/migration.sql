-- AlterTable
ALTER TABLE "assessments" ADD COLUMN "duration_minutes" INTEGER,
ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "assessment_questions" ADD COLUMN "explanation" TEXT;

-- AlterTable
ALTER TABLE "student_answers" ADD COLUMN "max_points_snapshot" DECIMAL(5,2) DEFAULT 1.00,
ADD COLUMN "teacher_feedback" TEXT;
