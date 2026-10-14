-- CreateEnum
CREATE TYPE "verification_token_type" AS ENUM ('LOGIN_OTP', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "auth_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" VARCHAR(100) NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "token_type" "verification_token_type" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_auth_verification_lookup" ON "auth_verification_tokens"("identifier", "token_type", "used_at", "expires_at");

-- CreateIndex
CREATE INDEX "idx_auth_verification_token" ON "auth_verification_tokens"("token_hash", "token_type");
