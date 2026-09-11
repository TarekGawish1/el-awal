-- Add site-visibility flag for landing-page certificates
ALTER TABLE "certificates" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT true;
