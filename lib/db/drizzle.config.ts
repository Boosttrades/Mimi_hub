import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl = process.env.SUPABASE_DATABASE_URL
  ?.trim()
  .replace(/^\s*base\s*[:=]\s*/i, "")
  .trim();

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL must be set for Drizzle migrations");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
