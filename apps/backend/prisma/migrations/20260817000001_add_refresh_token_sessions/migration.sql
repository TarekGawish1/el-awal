-- Create refresh-token session table for server-side rotation and revocation.
CREATE TABLE "refresh_token_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refresh_token_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_refresh_sessions_token_hash" ON "refresh_token_sessions"("token_hash");
CREATE INDEX "idx_refresh_sessions_user_active" ON "refresh_token_sessions"("user_id", "revoked_at", "expires_at");
CREATE INDEX "idx_refresh_sessions_expiry" ON "refresh_token_sessions"("expires_at");

ALTER TABLE "refresh_token_sessions"
    ADD CONSTRAINT "refresh_token_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
