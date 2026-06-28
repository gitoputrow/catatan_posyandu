import "server-only";

import type {
  GrowthHistoryChild,
  GrowthHistoryMeasurement,
  GrowthHistoryResponse,
} from "@/components/growth-history/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { getAuthenticatedPetugas } from "@/lib/user/server";

export async function getGrowthHistory(
  month: number,
  year: number,
  childId?: string,
  includeAllChildren = false,
): Promise<GrowthHistoryResponse> {
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const selectedPeriodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);
  const { supabase, posyanduId } = await getAuthenticatedPetugas();

  const { data: childRows, error: childError } = await supabase
    .from("balita")
    .select("id, nama_anak, jenis_kelamin, tanggal_lahir, nik_anak, nama_ayah, nama_ibu, nik_ortu, alamat, rt, rw, nama_posyandu, nama_kelurahan")
    .eq("posyandu_id", posyanduId)
    .gte("registered_at", registrationStart)
    .lt("registered_at", selectedPeriodEnd)
    .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestDisplayedBirthDate}`)
    .order("nama_anak", { ascending: true });

  if (childError) throw childError;

  const children: GrowthHistoryChild[] = (childRows ?? []).map((child) => ({
    id: child.id,
    nama: child.nama_anak,
    jenis_kelamin: child.jenis_kelamin,
    tanggal_lahir: child.tanggal_lahir,
    nik_anak: child.nik_anak,
    nama_ayah: child.nama_ayah,
    nama_ibu: child.nama_ibu,
    nik_ortu: child.nik_ortu,
    alamat: child.alamat,
    rt: child.rt,
    rw: child.rw,
    nama_posyandu: child.nama_posyandu,
    nama_kelurahan: child.nama_kelurahan,
  }));

  const requestedChildExists = children.some((child) => child.id === childId);
  const selectedChildId = requestedChildExists ? childId! : children[0]?.id ?? null;
  const childIds = includeAllChildren
    ? children.map((child) => child.id)
    : selectedChildId
      ? [selectedChildId]
      : [];

  if (childIds.length === 0) {
    return { children, selectedChildId, measurements: [] };
  }

  const { data: measurementRows, error: measurementError } = await supabase
    .from("tumbuh_kembang_balita")
    .select("balita_id, periode_bulan, berat_badan, tinggi_badan, lingkar_kepala, lingkar_lengan")
    .eq("posyandu_id", posyanduId)
    .in("balita_id", childIds)
    .gte("periode_bulan", registrationStart)
    .lt("periode_bulan", selectedPeriodEnd)
    .order("periode_bulan", { ascending: true });

  if (measurementError) throw measurementError;

  return {
    children,
    selectedChildId,
    measurements: (measurementRows ?? []) as GrowthHistoryMeasurement[],
  };
}
