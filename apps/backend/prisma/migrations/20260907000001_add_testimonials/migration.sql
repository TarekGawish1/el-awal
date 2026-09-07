CREATE TYPE "testimonial_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "testimonials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "status" "testimonial_status" NOT NULL DEFAULT 'PENDING',
  "moderated_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "testimonials_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "testimonials_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE INDEX "idx_testimonials_student_created"
  ON "testimonials"("student_id", "created_at");
CREATE INDEX "idx_testimonials_status_created"
  ON "testimonials"("status", "created_at");
