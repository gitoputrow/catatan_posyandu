import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
const migrationPath = process.argv[2];
const hasApplyFlag = process.argv.includes("--apply");

if (!databaseUrl) throw new Error("DATABASE_URL_POOLED atau DATABASE_URL belum diatur.");
if (!migrationPath) throw new Error("Path migration wajib diberikan.");
if (!hasApplyFlag) throw new Error("Tambahkan flag --apply untuk menjalankan migration.");

const migrationSql = await readFile(resolve(migrationPath), "utf8");
const statements = migrationSql
  .split("-- statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(databaseUrl);
await sql.transaction(statements.map((statement) => sql.query(statement)));

console.log(`Migration berhasil diterapkan (${statements.length} statements).`);
