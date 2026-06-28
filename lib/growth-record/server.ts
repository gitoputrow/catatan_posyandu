import "server-only";

import type {
  GrowthRecordModel,
  GrowthRecordViewModel,
} from "@/components/growth-record/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { getAuthenticatedPetugas } from "@/lib/user/server";

const tableName = "tumbuh_kembang_balita";

export type GrowthRecordInput = Omit<
  GrowthRecordModel,
  "id" | "posyandu_id" | "created_at" | "updated_at"
>;
export type GrowthRecordUpdateInput = Partial<
  Omit<GrowthRecordInput, "balita_id" | "periode_bulan">
>;

type ChildForGrowthRecord = {
  id: string;
  posyandu_id: string;
  alamat: string | null;
  jenis_kelamin: "L" | "P";
  nama_anak: string;
  nama_ayah: string | null;
  nama_ibu: string | null;
  nik_anak: string | null;
  nik_ortu: string | null;
  tanggal_lahir: string | null;
};

type GrowthRecordRow = GrowthRecordModel & {
  balita: {
    alamat: string | null;
    jenis_kelamin: "L" | "P";
    nama_anak: string;
    nama_ayah: string | null;
    nama_ibu: string | null;
    nik_anak: string | null;
    nik_ortu: string | null;
    tanggal_lahir: string | null;
  };
};

const recordSelect = `
  id,
  balita_id,
  posyandu_id,
  periode_bulan,
  tanggal_pengukuran,
  berat_badan,
  tinggi_badan,
  lingkar_kepala,
  lingkar_lengan,
  catatan,
  created_at,
  updated_at,
  balita:balita_id!inner(
    alamat,
    jenis_kelamin,
    nama_anak,
    nama_ayah,
    nama_ibu,
    nik_anak,
    nik_ortu,
    tanggal_lahir
  )
`;

const measurementSelect = `
  id,
  balita_id,
  posyandu_id,
  periode_bulan,
  tanggal_pengukuran,
  berat_badan,
  tinggi_badan,
  lingkar_kepala,
  lingkar_lengan,
  catatan,
  created_at,
  updated_at
`;

export async function listGrowthRecords(
  page: number,
  limit: number,
  month: number,
  year: number,
  search?: string,
) {
  const from = (page - 1) * limit;
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  // Daftar balita kumulatif dari Januari hingga bulan yang dipilih.
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const query = supabase
    .from("balita")
    .select(
      "id, posyandu_id, alamat, jenis_kelamin, nama_anak, nama_ayah, nama_ibu, nik_anak, nik_ortu, tanggal_lahir",
      { count: "exact" },
    )
    .eq("posyandu_id", posyanduId)
    .gte("registered_at", registrationStart)
    .lt("registered_at", periodEnd)
    .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestDisplayedBirthDate}`);
  const normalizedSearch = search?.trim();
  const safeSearch = normalizedSearch?.replace(/[%,_(),]/g, " ");
  const filteredQuery = safeSearch
    ? query.ilike("nama_anak", `%${safeSearch}%`)
    : query;
  const { data: children, error, count } = await filteredQuery
    .order("nama_anak", { ascending: true })
    .range(from, from + limit - 1);

  if (error || !children?.length) return { data: [], error, count };

  const childIds = children.map((child) => child.id);
  const { data: measurements, error: measurementError } = await supabase
    .from(tableName)
    .select(measurementSelect)
    .in("balita_id", childIds)
    .order("periode_bulan", { ascending: false });

  if (measurementError) return { data: [], error: measurementError, count };

  const measurementByChild = new Map<string, GrowthRecordModel>();
  for (const measurement of (measurements ?? []) as GrowthRecordModel[]) {
    if (!isSamePeriod(measurement.periode_bulan, month, year)) continue;
    if (!measurementByChild.has(measurement.balita_id)) {
      measurementByChild.set(measurement.balita_id, measurement);
    }
  }

  return {
    data: (children as ChildForGrowthRecord[]).map((child) =>
      toListViewModel(child, measurementByChild.get(child.id), periodStart),
    ),
    error: null,
    count,
  };
}

export async function findGrowthRecordById(id: string) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const { data, error } = await supabase
    .from(tableName)
    .select(recordSelect)
    .eq("id", id)
    .eq("posyandu_id", posyanduId)
    .single();

  return { data: data ? toViewModel(data as unknown as GrowthRecordRow) : null, error };
}

export async function createGrowthRecord(record: GrowthRecordInput) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const { data: child, error: childError } = await supabase
    .from("balita")
    .select("id")
    .eq("id", record.balita_id)
    .eq("posyandu_id", posyanduId)
    .single();

  if (childError) throw childError;
  if (!child) throw new Error("Data balita tidak ditemukan.");

  return supabase
    .from(tableName)
    .insert({ ...record, posyandu_id: posyanduId })
    .select(measurementSelect)
    .single();
}

export async function updateGrowthRecordById(id: string, record: GrowthRecordUpdateInput) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  return supabase
    .from(tableName)
    .update({ ...record, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("posyandu_id", posyanduId)
    .select(measurementSelect)
    .single();
}

export async function deleteGrowthRecordById(id: string) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  return supabase
    .from(tableName)
    .delete()
    .eq("id", id)
    .eq("posyandu_id", posyanduId)
    .select("id")
    .maybeSingle();
}

function toListViewModel(
  child: ChildForGrowthRecord,
  measurement: GrowthRecordModel | undefined,
  periodStart: string,
): GrowthRecordViewModel {
  return {
    id: measurement?.id ?? null,
    balita_id: child.id,
    posyandu_id: measurement?.posyandu_id ?? child.posyandu_id,
    nama: child.nama_anak,
    jenis_kelamin: child.jenis_kelamin,
    tanggal_lahir: child.tanggal_lahir ?? "",
    nik_anak: child.nik_anak,
    nama_ayah: child.nama_ayah,
    nama_ibu: child.nama_ibu,
    nik_ortu: child.nik_ortu,
    alamat: child.alamat,
    periode_bulan: measurement?.periode_bulan ?? periodStart,
    tanggal_pengukuran: measurement?.tanggal_pengukuran ?? null,
    berat_badan: measurement?.berat_badan ?? null,
    tinggi_badan: measurement?.tinggi_badan ?? null,
    lingkar_kepala: measurement?.lingkar_kepala ?? null,
    lingkar_lengan: measurement?.lingkar_lengan ?? null,
    catatan: measurement?.catatan ?? null,
    created_at: measurement?.created_at ?? null,
    updated_at: measurement?.updated_at ?? null,
  };
}

function toViewModel(record: GrowthRecordRow): GrowthRecordViewModel {
  return {
    id: record.id,
    balita_id: record.balita_id,
    posyandu_id: record.posyandu_id,
    nama: record.balita.nama_anak,
    jenis_kelamin: record.balita.jenis_kelamin,
    tanggal_lahir: record.balita.tanggal_lahir ?? "",
    nik_anak: record.balita.nik_anak,
    nama_ayah: record.balita.nama_ayah,
    nama_ibu: record.balita.nama_ibu,
    nik_ortu: record.balita.nik_ortu,
    alamat: record.balita.alamat,
    periode_bulan: record.periode_bulan,
    tanggal_pengukuran: record.tanggal_pengukuran,
    berat_badan: record.berat_badan,
    tinggi_badan: record.tinggi_badan,
    lingkar_kepala: record.lingkar_kepala,
    lingkar_lengan: record.lingkar_lengan,
    catatan: record.catatan,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function isSamePeriod(value: string | null | undefined, month: number, year: number) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const yearMonth = value.match(/^(\d{4})-(\d{1,2})/);
    return yearMonth
      ? Number(yearMonth[1]) === year && Number(yearMonth[2]) === month
      : false;
  }

  return date.getFullYear() === year && date.getMonth() + 1 === month;
}
