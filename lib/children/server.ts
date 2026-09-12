import "server-only";

import type { Child } from "@/components/children/types";
import { DatabaseNotFoundError, databaseResult, deleteRow, insertRow, queryOne, queryRows, updateRow } from "@/lib/neon/query";
import { canViewSensitiveData, redactChildSensitiveData } from "@/lib/privacy-server";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "balita";
const childColumns = [
  "alamat", "hp_ortu", "jenis_kelamin", "kelurahan_id", "nama_anak", "nama_ayah",
  "nama_ibu", "nama_kelurahan", "nama_posyandu", "nik_anak", "nik_ortu", "no_hp_ayah",
  "no_hp_ibu", "no_urut_anak", "nomor_kk", "posyandu_id", "rt", "rw", "tanggal_lahir",
  "registered_at", "inactive_at", "status", "inactive_reason", "created_by", "updated_at",
] as const;
const childSelectColumns = ["id", ...childColumns, "created_at"] as const;
const childSelect = childSelectColumns.join(", ");
const childSelectWithAlias = childSelectColumns.map((column) => `b.${column}`).join(", ");
export const maxDisplayedAgeInMonths = 60;
export type ChildSort = "age" | "name" | "newest";

export type ChildInput = Omit<
  Child,
  "id" | "inactive_at" | "inactive_reason" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at"
>;

export async function listChildren(
  page: number,
  limit: number,
  search?: string,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  sort: ChildSort = "name",
) {
  const offset = (page - 1) * limit;
  // Periode bersifat kumulatif dalam satu tahun: Januari sampai bulan pilihan.
  const periodStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const selectedPeriodStart = formatDateOnly(new Date(Date.UTC(year, month - 1, 1)));
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);
  const { posyanduId, role } = await getAuthenticatedPetugas();
  const normalizedSearch = search?.trim();
  const searchValue = normalizedSearch ? `%${normalizedSearch}%` : null;
  const orderBy = sort === "newest"
    ? "registered_at desc nulls last, nama_anak asc"
    : sort === "age"
      ? "tanggal_lahir asc nulls last, nama_anak asc"
      : "nama_anak asc";
  const params = [posyanduId, periodStart, periodEnd, oldestDisplayedBirthDate, searchValue, selectedPeriodStart];
  const searchCondition = canViewSensitiveData(role)
    ? "nama_anak ilike $5 or nik_anak ilike $5 or nama_posyandu ilike $5 or nama_ibu ilike $5"
    : "nama_anak ilike $5";
  const where = `posyandu_id = $1
    and registered_at >= $2::timestamptz
    and registered_at < $3::timestamptz
    and (tanggal_lahir is null or tanggal_lahir >= $4::date)
    and ($5::text is null or ${searchCondition})
    and (inactive_at is null or inactive_at::date >= $6::date)`;
  const [data, countRow] = await Promise.all([
    queryRows<Child>(`select ${childSelect} from balita where ${where} order by ${orderBy} limit $7 offset $8`, [...params, limit, offset]),
    queryOne<{ count: number }>(`select count(*)::int as count from balita where ${where}`, params),
  ]);
  return databaseResult(
    data.map((child) => redactChildSensitiveData(child, role)),
    countRow?.count ?? 0,
  );
}

export async function createChild(child: ChildInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const data = await insertRow<Child>(tableName, {
    ...child,
    posyandu_id: posyanduId,
    created_by: petugasId,
    registered_at: new Date().toISOString(),
  }, childColumns);
  return databaseResult(data);
}

export async function findChildById(id: string) {
  const { posyanduId, role } = await getAuthenticatedPetugas();
  const data = await queryOne<Child>(
    `select ${childSelectWithAlias}, p.nama as created_by_name
     from balita b
     left join petugas p on p.id = b.created_by and p.posyandu_id = b.posyandu_id
     where b.id = $1 and b.posyandu_id = $2`,
    [id, posyanduId],
  );
  if (!data) throw new DatabaseNotFoundError("Data balita tidak ditemukan.");
  return databaseResult(redactChildSensitiveData(data, role));
}

export async function updateChildById(id: string, child: Partial<ChildInput>) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  const childData = { ...child } as Partial<Child> & Record<string, unknown>;
  delete childData.created_by;
  delete childData.created_by_name;
  delete childData.posyandu_id;
  const data = await updateRow<Child>(tableName, { ...childData, updated_at: new Date().toISOString() }, childColumns, { id, posyandu_id: posyanduId });
  return databaseResult(data);
}

export async function deactivateChildById(id: string, inactiveAt: string, inactiveReason: string) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  const data = await updateRow<Child>(tableName, {
    inactive_at: `${inactiveAt}T00:00:00.000Z`,
    inactive_reason: inactiveReason.trim(),
    updated_at: new Date().toISOString(),
  }, childColumns, { id, posyandu_id: posyanduId });
  return databaseResult(data);
}

export async function reactivateChildById(id: string) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  const data = await updateRow<Child>(tableName, {
    inactive_at: null,
    inactive_reason: null,
    updated_at: new Date().toISOString(),
  }, childColumns, { id, posyandu_id: posyanduId });
  return databaseResult(data);
}

export async function deleteChildById(id: string) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  return databaseResult(await deleteRow<{ id: string }>(tableName, { id, posyandu_id: posyanduId }));
}

export async function listKelurahan() {
  await getAuthenticatedPetugas();
  return databaseResult(await queryRows<{ id: string; nama_kelurahan: string }>("select id, nama_kelurahan from kelurahan order by nama_kelurahan"));
}

export async function listPosyandu(kelurahanId?: string) {
  const { posyanduId } = await getAuthenticatedPetugas();
  return databaseResult(await queryRows<{ id: string; kelurahan_id: string; nama_posyandu: string }>(
    `select id, kelurahan_id, nama_posyandu from posyandu
     where id = $1 and ($2::uuid is null or kelurahan_id = $2::uuid)
     order by nama_posyandu`,
    [posyanduId, kelurahanId ?? null],
  ));
}

export function getOldestDisplayedBirthDate(month: number, year: number) {
  return formatDateOnly(
    new Date(Date.UTC(year, month - 1 - maxDisplayedAgeInMonths, 1)),
  );
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
