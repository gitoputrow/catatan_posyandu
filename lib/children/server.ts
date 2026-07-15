import "server-only";

import type { Child } from "@/components/children/types";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "balita";
export const maxDisplayedAgeInMonths = 60;

export type ChildInput = Omit<
  Child,
  "id" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at"
>;

export async function listChildren(
  page: number,
  limit: number,
  search?: string,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
) {
  const from = (page - 1) * limit;
  // Periode bersifat kumulatif dalam satu tahun: Januari sampai bulan pilihan.
  const periodStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const query = supabase
    .from(tableName)
    .select("*", { count: "exact" })
    .eq("posyandu_id", posyanduId)
    .gte("registered_at", periodStart)
    .lt("registered_at", periodEnd)
    .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestDisplayedBirthDate}`);
  const normalizedSearch = search?.trim();
  const safeSearch = normalizedSearch?.replace(/[%,_(),]/g, " ");
  const filteredQuery = safeSearch
    ? query.or(
        `nama_anak.ilike.%${safeSearch}%,nik_anak.ilike.%${safeSearch}%,nama_posyandu.ilike.%${safeSearch}%,nama_ibu.ilike.%${safeSearch}%`,
      )
    : query;
  const result = await filteredQuery
    .order("nama_anak", { ascending: true })
    .range(from, from + limit - 1);

  return result;
}

export async function createChild(child: ChildInput) {
  const { petugasId, supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  return supabase
    .from(tableName)
    .insert({ ...child, posyandu_id: posyanduId, created_by: petugasId, registered_at: new Date().toISOString() })
    .select()
    .single();
}

export async function findChildById(id: string) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const result = await supabase.from(tableName).select("*").eq("id", id).eq("posyandu_id", posyanduId).single();
  if (result.error || !result.data?.created_by) return result;

  const { data: creator } = await supabase
    .from("petugas")
    .select("nama")
    .eq("id", result.data.created_by)
    .eq("posyandu_id", posyanduId)
    .maybeSingle();

  return {
    ...result,
    data: {
      ...result.data,
      created_by_name: creator?.nama ?? null,
    },
  };
}

export async function updateChildById(id: string, child: Partial<ChildInput>) {
  const { supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  const childData = { ...child } as Partial<Child> & Record<string, unknown>;
  delete childData.created_by;
  delete childData.created_by_name;
  delete childData.posyandu_id;
  return supabase
    .from(tableName)
    .update({ ...childData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("posyandu_id", posyanduId)
    .select()
    .single();
}

export async function deleteChildById(id: string) {
  const { supabase, posyanduId } = await getAuthenticatedPetugasForWrite();
  return supabase.from(tableName).delete().eq("id", id).eq("posyandu_id", posyanduId).select("id").maybeSingle();
}

export async function listKelurahan() {
  const { supabase } = await getAuthenticatedPetugas();
  return supabase.from("kelurahan").select("id, nama_kelurahan").order("nama_kelurahan");
}

export async function listPosyandu(kelurahanId?: string) {
  const { supabase, posyanduId } = await getAuthenticatedPetugas();
  const query = supabase.from("posyandu").select("id, kelurahan_id, nama_posyandu").order("nama_posyandu");
  const scopedQuery = query.eq("id", posyanduId);
  return kelurahanId ? scopedQuery.eq("kelurahan_id", kelurahanId) : scopedQuery;
}

export function getOldestDisplayedBirthDate(month: number, year: number) {
  return formatDateOnly(
    new Date(Date.UTC(year, month - 1 - maxDisplayedAgeInMonths, 1)),
  );
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
