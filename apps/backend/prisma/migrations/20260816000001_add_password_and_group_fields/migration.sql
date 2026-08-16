-- AlterTable
ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(255) NOT NULL DEFAULT '$2b$10$epRsf57xTsmJExnK16F4quZg6n5yX.eQG4iKqA7ZfAepjR9P8gOqe';

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN "academic_stage" VARCHAR(50);

-- AlterTable
ALTER TABLE "academic_groups" ADD COLUMN "description" TEXT,
ADD COLUMN "max_capacity" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
