import "server-only";

import type {
  GrowthHistoryChild,
  GrowthHistoryMeasurement,
  GrowthHistoryResponse,
} from "@/components/growth-history/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { pgUuidArray, queryRows } from "@/lib/neon/query";
import { redactGrowthHistoryChildSensitiveData } from "@/lib/privacy-server";
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
  const { posyanduId, role } = await getAuthenticatedPetugas();

  const childRows = await queryRows<{
    id: string; nama_anak: string; jenis_kelamin: "L" | "P"; tanggal_lahir: string | null;
    nik_anak: string | null; nama_ayah: string | null; nama_ibu: string | null;
    nik_ortu: string | null; alamat: string | null; rt: string | null; rw: string | null;
    nama_posyandu: string | null; nama_kelurahan: string | null;
  }>(
    `select id, nama_anak, jenis_kelamin, tanggal_lahir, nik_anak, nama_ayah, nama_ibu,
            nik_ortu, alamat, rt, rw, nama_posyandu, nama_kelurahan
     from balita
     where posyandu_id = $1
       and registered_at >= $2::timestamptz
       and registered_at < $3::timestamptz
       and (tanggal_lahir is null or tanggal_lahir >= $4::date)
     order by nama_anak`,
    [posyanduId, registrationStart, selectedPeriodEnd, oldestDisplayedBirthDate],
  );

  const children: GrowthHistoryChild[] = childRows.map((child) => redactGrowthHistoryChildSensitiveData({
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
  }, role));

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

  const measurementRows = await queryRows<GrowthHistoryMeasurement>(
    `select balita_id, periode_bulan,
            berat_badan::float8 as berat_badan, tinggi_badan::float8 as tinggi_badan,
            lingkar_kepala::float8 as lingkar_kepala, lingkar_lengan::float8 as lingkar_lengan
     from tumbuh_kembang_balita
     where posyandu_id = $1 and balita_id = any($2::uuid[])
       and periode_bulan >= $3::date and periode_bulan < $4::date
     order by periode_bulan`,
    [posyanduId, pgUuidArray(childIds), registrationStart, selectedPeriodEnd],
  );

  return {
    children,
    selectedChildId,
    measurements: measurementRows,
  };
}
