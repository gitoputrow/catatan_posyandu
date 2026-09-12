import "server-only";

import { sql } from "@/lib/neon/server";
import { getDatabaseRequestAuthUserId } from "@/lib/neon/request-context";

const databaseRuntimeRole = "app_runtime";

export type DatabaseResult<T> = {
  data: T;
  error: null;
  count?: number | null;
};

export class DatabaseNotFoundError extends Error {
  code = "NOT_FOUND";

  constructor(message = "Data tidak ditemukan.") {
    super(message);
    this.name = "DatabaseNotFoundError";
  }
}

export async function queryRows<T>(query: string, params: unknown[] = []) {
  const authUserId = getDatabaseRequestAuthUserId();
  if (authUserId === undefined) {
    throw new Error("Konteks keamanan database tidak tersedia.");
  }

  const transactionResults = await sql.transaction((transaction) => [
    transaction`select set_config('app.auth_user_id', ${authUserId ?? ""}, true)`,
    transaction.query(`set local role ${quoteIdentifier(databaseRuntimeRole)}`),
    transaction.query(query, params),
  ]);
  const rows = transactionResults[2];
  return normalizeDatabaseValue(rows) as T[];
}

export async function queryOne<T>(query: string, params: unknown[] = []) {
  const rows = await queryRows<T>(query, params);
  return rows[0] ?? null;
}

export function databaseResult<T>(data: T, count?: number | null): DatabaseResult<T> {
  return count === undefined ? { data, error: null } : { data, error: null, count };
}

export async function insertRow<T>(
  table: string,
  payload: Record<string, unknown>,
  allowedColumns: readonly string[],
) {
  const entries = getAllowedEntries(payload, allowedColumns);
  if (entries.length === 0) throw new Error("Tidak ada data yang dapat disimpan.");

  const columns = entries.map(([column]) => quoteIdentifier(column)).join(", ");
  const placeholders = entries.map((_, index) => `$${index + 1}`).join(", ");
  const row = await queryOne<T>(
    `insert into ${quoteIdentifier(table)} (${columns}) values (${placeholders}) returning *`,
    entries.map(([, value]) => value),
  );
  if (!row) throw new Error("Data gagal disimpan.");
  return row;
}

export async function updateRow<T>(
  table: string,
  payload: Record<string, unknown>,
  allowedColumns: readonly string[],
  conditions: Record<string, unknown>,
) {
  const entries = getAllowedEntries(payload, allowedColumns);
  if (entries.length === 0) throw new Error("Tidak ada perubahan yang dapat disimpan.");

  const conditionEntries = Object.entries(conditions);
  const assignments = entries
    .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
    .join(", ");
  const where = conditionEntries
    .map(([column], index) => `${quoteIdentifier(column)} = $${entries.length + index + 1}`)
    .join(" and ");
  const row = await queryOne<T>(
    `update ${quoteIdentifier(table)} set ${assignments} where ${where} returning *`,
    [...entries.map(([, value]) => value), ...conditionEntries.map(([, value]) => value)],
  );
  if (!row) throw new DatabaseNotFoundError();
  return row;
}

export async function deleteRow<T>(table: string, conditions: Record<string, unknown>) {
  const entries = Object.entries(conditions);
  const where = entries
    .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
    .join(" and ");
  return queryOne<T>(
    `delete from ${quoteIdentifier(table)} where ${where} returning *`,
    entries.map(([, value]) => value),
  );
}

export function pgUuidArray(values: string[]) {
  for (const value of values) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error("ID UUID tidak valid.");
    }
  }
  return `{${values.join(",")}}`;
}

function getAllowedEntries(payload: Record<string, unknown>, allowedColumns: readonly string[]) {
  const allowed = new Set(allowedColumns);
  return Object.entries(payload).filter(([column, value]) => allowed.has(column) && value !== undefined);
}

function quoteIdentifier(identifier: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) throw new Error("Identifier database tidak valid.");
  return `"${identifier}"`;
}

function normalizeDatabaseValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeDatabaseValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeDatabaseValue(nestedValue)]),
    );
  }
  return value;
}
