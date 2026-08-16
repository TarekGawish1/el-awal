-- AlterTable
ALTER TABLE "courses" ADD COLUMN "academic_stage" VARCHAR(50),
ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "course_lessons" ADD COLUMN "lesson_type" VARCHAR(50) NOT NULL DEFAULT 'VIDEO',
ADD COLUMN "bunny_video_id" VARCHAR(255),
ADD COLUMN "content_url" TEXT;
