
-- AlterTable
ALTER TABLE "academic_groups" ADD COLUMN     "registration_token" VARCHAR(64),
ADD COLUMN     "is_registration_open" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "registration_link_expiry" TIMESTAMPTZ(6);

-- CreateIndex
CREATE UNIQUE INDEX "uq_groups_registration_token" ON "academic_groups" ("registration_token");
