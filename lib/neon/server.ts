import "server-only";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_POOLED atau DATABASE_URL belum diatur di environment.");
}

export const sql = neon(databaseUrl);
