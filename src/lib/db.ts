import { neon } from "@neondatabase/serverless";

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Run `neon env pull` or check .env.local.");
  }
  return neon(url);
}
