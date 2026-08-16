-- ============================================================================
-- El Awal Educational Management System
-- Initial Migration: Schema, Enums, Constraints, Partial Indexes & Extensions
-- Target Database: PostgreSQL 16+ (Neon Cloud)
-- ============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE "user_role" AS ENUM ('TEACHER', 'STUDENT', 'PARENT', 'SECRETARIAT');
CREATE TYPE "student_academic_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'ARCHIVED');
CREATE TYPE "group_enrollment_status" AS ENUM ('ACTIVE', 'TRANSFERRED', 'DROPPED');
CREATE TYPE "attendance_status" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');
CREATE TYPE "recording_method" AS ENUM ('QR_SCAN', 'MANUAL');
CREATE TYPE "course_status" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "course_enrollment_status" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');
CREATE TYPE "course_access_status" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED');
CREATE TYPE "content_type" AS ENUM ('FILE', 'SUMMARY', 'REFERENCE', 'LECTURE_RECORDING');
CREATE TYPE "assessment_type" AS ENUM ('ASSIGNMENT', 'EXAM');
CREATE TYPE "question_type" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY');
CREATE TYPE "submission_status" AS ENUM ('SUBMITTED', 'GRADED', 'UNSOLVED');
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'EXEMPT', 'REFUNDED');

-- ============================================================================
-- 2. CORE IDENTITY & USERS DOMAIN
-- ============================================================================

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30) NULL,
    "email" VARCHAR(255) NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

CREATE TABLE "teacher_profiles" (
    "id" UUID NOT NULL,
    "specialty" VARCHAR(100) NULL,
    "bio" TEXT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_teacher_profiles" PRIMARY KEY ("id"),
    CONSTRAINT "fk_teacher_user" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "student_code" VARCHAR(50) NULL,
    "qr_code_token" VARCHAR(255) NOT NULL,
    "grade_level" VARCHAR(50) NOT NULL,
    "academic_status" "student_academic_status" NOT NULL DEFAULT 'ACTIVE',
    "date_of_birth" DATE NULL,
    "emergency_phone" VARCHAR(30) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_student_profiles" PRIMARY KEY ("id"),
    CONSTRAINT "fk_student_user" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "parent_profiles" (
    "id" UUID NOT NULL,
    "relationship_type" VARCHAR(50) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_parent_profiles" PRIMARY KEY ("id"),
    CONSTRAINT "fk_parent_user" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "secretariat_profiles" (
    "id" UUID NOT NULL,
    "staff_title" VARCHAR(100) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_secretariat_profiles" PRIMARY KEY ("id"),
    CONSTRAINT "fk_secretariat_user" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "parent_student_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_parent_student_links" PRIMARY KEY ("id"),
    CONSTRAINT "fk_pslink_parent" FOREIGN KEY ("parent_id") REFERENCES "parent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_pslink_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uq_parent_student" UNIQUE ("parent_id", "student_id"),
    CONSTRAINT "chk_parent_not_student" CHECK ("parent_id" <> "student_id")
);

-- ============================================================================
-- 3. PHYSICAL LEARNING DOMAIN
-- ============================================================================

CREATE TABLE "academic_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "grade_level" VARCHAR(50) NOT NULL,
    "teacher_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_academic_groups" PRIMARY KEY ("id"),
    CONSTRAINT "fk_group_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "group_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "group_enrollment_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "pk_group_enrollments" PRIMARY KEY ("id"),
    CONSTRAINT "fk_genroll_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_genroll_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_group_student" UNIQUE ("group_id", "student_id")
);

CREATE TABLE "lesson_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "location" VARCHAR(150) NULL,

    CONSTRAINT "pk_lesson_schedules" PRIMARY KEY ("id"),
    CONSTRAINT "fk_schedule_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chk_schedule_day" CHECK ("day_of_week" BETWEEN 0 AND 6),
    CONSTRAINT "chk_schedule_time_window" CHECK ("end_time" > "start_time")
);

CREATE TABLE "lesson_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "schedule_id" UUID NULL,
    "session_date" DATE NOT NULL,
    "start_time" VARCHAR(10) NULL,
    "topic" VARCHAR(255) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_lesson_sessions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_session_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_session_schedule" FOREIGN KEY ("schedule_id") REFERENCES "lesson_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "uq_group_session_datetime" UNIQUE ("group_id", "session_date", "start_time")
);

CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "attendance_status" NOT NULL,
    "recording_method" "recording_method" NOT NULL DEFAULT 'MANUAL',
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NULL,

    CONSTRAINT "pk_attendance_records" PRIMARY KEY ("id"),
    CONSTRAINT "fk_att_session" FOREIGN KEY ("session_id") REFERENCES "lesson_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_att_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_att_recorded_by" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_session_student" UNIQUE ("session_id", "student_id")
);

-- ============================================================================
-- 4. ONLINE LEARNING DOMAIN
-- ============================================================================

CREATE TABLE "courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "grade_level" VARCHAR(50) NOT NULL,
    "cover_image_url" TEXT NULL,
    "status" "course_status" NOT NULL DEFAULT 'DRAFT',
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_courses" PRIMARY KEY ("id"),
    CONSTRAINT "fk_course_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "course_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_course_modules" PRIMARY KEY ("id"),
    CONSTRAINT "fk_module_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uq_course_module_order" UNIQUE ("course_id", "order_index") DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE "course_lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "order_index" INTEGER NOT NULL,
    "video_asset_id" VARCHAR(255) NULL,
    "video_duration_seconds" INTEGER NULL,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_course_lessons" PRIMARY KEY ("id"),
    CONSTRAINT "fk_lesson_module" FOREIGN KEY ("module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uq_module_lesson_order" UNIQUE ("module_id", "order_index") DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT "chk_lesson_duration" CHECK ("video_duration_seconds" IS NULL OR "video_duration_seconds" >= 0)
);

CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "course_enrollment_status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "pk_course_enrollments" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cenroll_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cenroll_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_course_student" UNIQUE ("course_id", "student_id")
);

CREATE TABLE "course_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "enrollment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "access_status" "course_access_status" NOT NULL DEFAULT 'ACTIVE',
    "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(6) NULL,
    "granted_by_id" UUID NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_course_access" PRIMARY KEY ("id"),
    CONSTRAINT "fk_access_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "course_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_access_granted_by" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "uq_access_enrollment" UNIQUE ("enrollment_id")
);

CREATE TABLE "course_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lesson_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "last_position_seconds" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "first_accessed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6) NULL,
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_operation_id" UUID NULL,

    CONSTRAINT "pk_course_progress" PRIMARY KEY ("id"),
    CONSTRAINT "fk_cprog_lesson" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_cprog_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_lesson_student_progress" UNIQUE ("lesson_id", "student_id"),
    CONSTRAINT "chk_progress_position" CHECK ("last_position_seconds" >= 0)
);

-- ============================================================================
-- 5. SHARED EDUCATIONAL ASSETS & PROGRESS
-- ============================================================================

CREATE TABLE "educational_content" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "group_id" UUID NULL,
    "lesson_id" UUID NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "content_type" "content_type" NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" BIGINT NULL,
    "mime_type" VARCHAR(100) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_educational_content" PRIMARY KEY ("id"),
    CONSTRAINT "fk_content_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_content_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_content_lesson" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chk_content_context" CHECK (
        ("group_id" IS NOT NULL AND "lesson_id" IS NULL) OR
        ("group_id" IS NULL AND "lesson_id" IS NOT NULL)
    )
);

CREATE TABLE "content_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "first_viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "view_count" INTEGER NOT NULL DEFAULT 1,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pk_content_progress" PRIMARY KEY ("id"),
    CONSTRAINT "fk_prog_content" FOREIGN KEY ("content_id") REFERENCES "educational_content"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_prog_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_content_student" UNIQUE ("content_id", "student_id"),
    CONSTRAINT "chk_content_view_count" CHECK ("view_count" >= 1)
);

-- ============================================================================
-- 6. ASSESSMENTS, EXAMS & SUBMISSIONS
-- ============================================================================

CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teacher_id" UUID NOT NULL,
    "group_id" UUID NULL,
    "course_id" UUID NULL,
    "lesson_id" UUID NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "type" "assessment_type" NOT NULL,
    "total_score" DECIMAL(6, 2) NOT NULL DEFAULT 100.00,
    "passing_score" DECIMAL(6, 2) NULL,
    "is_auto_graded" BOOLEAN NOT NULL DEFAULT false,
    "due_date" TIMESTAMPTZ(6) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_assessments" PRIMARY KEY ("id"),
    CONSTRAINT "fk_assess_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_assess_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_assess_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_assess_lesson" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chk_assessment_scores" CHECK (
        "total_score" > 0 AND 
        ("passing_score" IS NULL OR ("passing_score" >= 0 AND "passing_score" <= "total_score"))
    ),
    CONSTRAINT "chk_assessment_context" CHECK (
        ("group_id" IS NOT NULL AND "course_id" IS NULL AND "lesson_id" IS NULL) OR
        ("group_id" IS NULL AND ("course_id" IS NOT NULL OR "lesson_id" IS NOT NULL))
    )
);

CREATE TABLE "assessment_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "question_number" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "question_type" NOT NULL,
    "options_data" JSONB NULL,
    "correct_answer" TEXT NOT NULL,
    "points" DECIMAL(5, 2) NOT NULL DEFAULT 1.00,

    CONSTRAINT "pk_assessment_questions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_quest_assessment" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "uq_assessment_question" UNIQUE ("assessment_id", "question_number"),
    CONSTRAINT "chk_question_points" CHECK ("points" > 0)
);

CREATE TABLE "assessment_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachment_url" TEXT NULL,
    "score_obtained" DECIMAL(6, 2) NULL,
    "is_auto_graded" BOOLEAN NOT NULL DEFAULT false,
    "graded_at" TIMESTAMPTZ(6) NULL,
    "teacher_feedback" TEXT NULL,

    CONSTRAINT "pk_assessment_submissions" PRIMARY KEY ("id"),
    CONSTRAINT "fk_sub_assessment" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_sub_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_assessment_student" UNIQUE ("assessment_id", "student_id"),
    CONSTRAINT "chk_submission_score" CHECK ("score_obtained" IS NULL OR "score_obtained" >= 0)
);

CREATE TABLE "student_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "selected_answer" TEXT NULL,
    "is_correct" BOOLEAN NULL,
    "points_earned" DECIMAL(5, 2) NULL,

    CONSTRAINT "pk_student_answers" PRIMARY KEY ("id"),
    CONSTRAINT "fk_ans_submission" FOREIGN KEY ("submission_id") REFERENCES "assessment_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fk_ans_question" FOREIGN KEY ("question_id") REFERENCES "assessment_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_submission_question" UNIQUE ("submission_id", "question_id")
);

-- ============================================================================
-- 7. EVALUATIONS, NOTIFICATIONS & PAYMENTS
-- ============================================================================

CREATE TABLE "student_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "group_id" UUID NULL,
    "evaluation_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "student_level" VARCHAR(50) NULL,
    "teacher_notes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_student_evaluations" PRIMARY KEY ("id"),
    CONSTRAINT "fk_eval_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_eval_teacher" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_eval_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "reference_entity_id" UUID NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6) NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_notifications" PRIMARY KEY ("id"),
    CONSTRAINT "fk_notif_recipient" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "student_payment_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_id" UUID NOT NULL,
    "group_id" UUID NULL,
    "period_year" SMALLINT NOT NULL,
    "period_month" SMALLINT NOT NULL,
    "amount_expected" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "amount_paid" DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'EGP',
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "payment_method" VARCHAR(50) NOT NULL DEFAULT 'CASH',
    "receipt_number" VARCHAR(100) NULL,
    "recorded_by_id" UUID NOT NULL,
    "notes" TEXT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_student_payment_records" PRIMARY KEY ("id"),
    CONSTRAINT "fk_pay_student" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fk_pay_group" FOREIGN KEY ("group_id") REFERENCES "academic_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_pay_recorder" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "uq_student_group_billing_period" UNIQUE ("student_id", "group_id", "period_year", "period_month"),
    CONSTRAINT "chk_payment_month" CHECK ("period_month" BETWEEN 1 AND 12),
    CONSTRAINT "chk_payment_year" CHECK ("period_year" >= 2020),
    CONSTRAINT "chk_payment_amounts" CHECK ("amount_expected" >= 0 AND "amount_paid" >= 0)
);

-- ============================================================================
-- 8. COMPREHENSIVE B-TREE FOREIGN KEY & QUERY INDEXES
-- ============================================================================

-- Users & Profiles
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_phone" ON "users"("phone");
CREATE INDEX "idx_students_qr_code" ON "student_profiles"("qr_code_token");
CREATE INDEX "idx_students_grade_level" ON "student_profiles"("grade_level");
CREATE INDEX "idx_parent_student_student" ON "parent_student_links"("student_id");
CREATE INDEX "idx_parent_student_parent" ON "parent_student_links"("parent_id");

-- Physical Groups & Sessions
CREATE INDEX "idx_groups_teacher" ON "academic_groups"("teacher_id");
CREATE INDEX "idx_groups_grade_active" ON "academic_groups"("grade_level", "is_active");
CREATE INDEX "idx_enrollments_student" ON "group_enrollments"("student_id");
CREATE INDEX "idx_group_enrollments_group_status" ON "group_enrollments"("group_id", "status");
CREATE INDEX "idx_schedules_group" ON "lesson_schedules"("group_id");
CREATE INDEX "idx_sessions_group_date" ON "lesson_sessions"("group_id", "session_date");
CREATE INDEX "idx_sessions_schedule" ON "lesson_sessions"("schedule_id");

-- Attendance
CREATE INDEX "idx_attendance_student_status" ON "attendance_records"("student_id", "status");
CREATE INDEX "idx_attendance_session" ON "attendance_records"("session_id");
CREATE INDEX "idx_attendance_recorder" ON "attendance_records"("recorded_by_id");

-- Courses & Modules
CREATE INDEX "idx_courses_teacher" ON "courses"("teacher_id");
CREATE INDEX "idx_courses_status_grade" ON "courses"("status", "grade_level");
CREATE INDEX "idx_modules_course_order" ON "course_modules"("course_id", "order_index");
CREATE INDEX "idx_lessons_module_order" ON "course_lessons"("module_id", "order_index");
CREATE INDEX "idx_course_enrollments_student" ON "course_enrollments"("student_id", "status");
CREATE INDEX "idx_course_enrollments_course" ON "course_enrollments"("course_id", "status");
CREATE INDEX "idx_course_access_student" ON "course_access"("student_id", "access_status");
CREATE INDEX "idx_course_access_course" ON "course_access"("course_id", "access_status");
CREATE INDEX "idx_course_access_grantor" ON "course_access"("granted_by_id");
CREATE INDEX "idx_course_progress_student" ON "course_progress"("student_id", "course_id");
CREATE INDEX "idx_course_progress_lesson" ON "course_progress"("lesson_id");

-- Content & Progress
CREATE INDEX "idx_content_group_type" ON "educational_content"("group_id", "content_type");
CREATE INDEX "idx_content_lesson_type" ON "educational_content"("lesson_id", "content_type");
CREATE INDEX "idx_content_teacher" ON "educational_content"("teacher_id");
CREATE INDEX "idx_progress_student" ON "content_progress"("student_id");
CREATE INDEX "idx_progress_content" ON "content_progress"("content_id");

-- Assessments & Submissions
CREATE INDEX "idx_assessments_group_type" ON "assessments"("group_id", "type");
CREATE INDEX "idx_assessments_course_type" ON "assessments"("course_id", "type");
CREATE INDEX "idx_assessments_lesson_type" ON "assessments"("lesson_id", "type");
CREATE INDEX "idx_assessments_teacher" ON "assessments"("teacher_id");
CREATE INDEX "idx_questions_assessment" ON "assessment_questions"("assessment_id");
CREATE INDEX "idx_submissions_assessment_status" ON "assessment_submissions"("assessment_id", "status");
CREATE INDEX "idx_submissions_student" ON "assessment_submissions"("student_id");
CREATE INDEX "idx_answers_question" ON "student_answers"("question_id");
CREATE INDEX "idx_answers_submission" ON "student_answers"("submission_id");

-- Evaluations, Notifications, Payments
CREATE INDEX "idx_evaluations_student_date" ON "student_evaluations"("student_id", "evaluation_date");
CREATE INDEX "idx_evaluations_teacher_group" ON "student_evaluations"("teacher_id", "group_id");
CREATE INDEX "idx_notifications_recipient_read" ON "notifications"("recipient_id", "is_read", "created_at");
CREATE INDEX "idx_payments_student" ON "student_payment_records"("student_id");
CREATE INDEX "idx_payments_recorder_group" ON "student_payment_records"("recorded_by_id", "group_id");

-- ============================================================================
-- 9. PARTIAL & COVERING INDEXES FOR HIGH-THROUGHPUT QUERIES
-- ============================================================================

-- Fast Unread Alerts Badge (< 2ms query latency)
CREATE INDEX "idx_notifications_active_unread" 
ON "notifications" ("recipient_id", "created_at" DESC) 
WHERE "is_read" = false;

-- Public Published Course Catalog Discovery
CREATE INDEX "idx_courses_catalog_search" 
ON "courses" ("grade_level", "status", "order_index" ASC) 
WHERE "status" = 'PUBLISHED';

-- Fast Active Cohort Rostering
CREATE INDEX "idx_group_enrollments_active" 
ON "group_enrollments" ("group_id", "enrolled_at" DESC) 
WHERE "status" = 'ACTIVE';

-- Instant Course Progress Rollup (Index-Only Scans)
CREATE INDEX "idx_course_progress_rollup" 
ON "course_progress" ("student_id", "course_id") 
INCLUDE ("is_completed", "last_position_seconds");

-- Instant Attendance Roll-Call Status Checking
CREATE INDEX "idx_attendance_session_roster" 
ON "attendance_records" ("session_id", "student_id") 
INCLUDE ("status", "recording_method", "recorded_at");

-- Teacher Ungraded Submissions Queue
CREATE INDEX "idx_submissions_grading_queue" 
ON "assessment_submissions" ("assessment_id", "submitted_at" ASC) 
WHERE "status" = 'SUBMITTED';

-- Soft-Delete Partial Unique Constraints
CREATE UNIQUE INDEX "uq_users_phone_active" 
ON "users" ("phone") 
WHERE "deleted_at" IS NULL AND "phone" IS NOT NULL;

CREATE UNIQUE INDEX "uq_users_email_active" 
ON "users" ("email") 
WHERE "deleted_at" IS NULL AND "email" IS NOT NULL;

CREATE UNIQUE INDEX "uq_students_code_active" 
ON "student_profiles" ("student_code") 
WHERE "student_code" IS NOT NULL;
