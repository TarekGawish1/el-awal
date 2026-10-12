import "dotenv/config";
import { defineConfig } from "prisma/config";

const rawUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/el_awal";

// If using Supabase pooler on port 6543 without explicit DIRECT_URL,
// use port 5432 (session pooler/direct) to avoid PgBouncer "prepared statement does not exist" errors
const migrationUrl =
  !process.env.DIRECT_URL && rawUrl.includes(":6543")
    ? rawUrl.replace(":6543", ":5432").replace(/[?&]pgbouncer=true/, "")
    : rawUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
