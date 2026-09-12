import "server-only";

import type {
  GrowthRecordModel,
  GrowthRecordViewModel,
  LastGrowthMeasurements,
} from "@/components/growth-record/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { calculateGrowthTrends, getPeriodTimestamp, type GrowthTrendMeasurement, withGrowthTrendChanges } from "@/lib/growth-trend";
import { databaseResult, deleteRow, insertRow, pgUuidArray, queryOne, queryRows, updateRow } from "@/lib/neon/query";
import { redactGrowthRecordSensitiveData } from "@/lib/privacy-server";
import { getAuthenticatedPetugas, getAuthenticatedPetugasForWrite } from "@/lib/user/server";

const tableName = "tumbuh_kembang_balita";
const growthRecordColumns = [
  "balita_id", "posyandu_id", "periode_bulan", "tanggal_pengukuran", "berat_badan",
  "tinggi_badan", "lingkar_kepala", "lingkar_lengan", "catatan", "created_by", "updated_at",
] as const;

export type GrowthRecordInput = Omit<
  GrowthRecordModel,
  "id" | "posyandu_id" | "created_by" | "created_at" | "updated_at"
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
  created_by_name: string | null;
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

type GrowthRecordWithCreator = GrowthRecordModel & {
  created_by_name: string | null;
};

export async function listGrowthRecords(
  page: number,
  limit: number,
  month: number,
  year: number,
  search?: string,
) {
  const offset = (page - 1) * limit;
  const periodStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const periodEnd = new Date(Date.UTC(year, month, 1)).toISOString();
  // Daftar balita kumulatif dari Januari hingga bulan yang dipilih.
  const registrationStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const oldestDisplayedBirthDate = getOldestDisplayedBirthDate(month, year);
  const { posyanduId, role } = await getAuthenticatedPetugas();
  const normalizedSearch = search?.trim();
  const searchValue = normalizedSearch ? `%${normalizedSearch}%` : null;
  const childParams = [posyanduId, registrationStart, periodEnd, oldestDisplayedBirthDate, searchValue, periodStart.slice(0, 10)];
  const childWhere = `posyandu_id = $1 and registered_at >= $2::timestamptz and registered_at < $3::timestamptz
    and (tanggal_lahir is null or tanggal_lahir >= $4::date)
    and ($5::text is null or nama_anak ilike $5)
    and (inactive_at is null or inactive_at::date >= $6::date)`;
  const [children, countRow, recordedRows] = await Promise.all([
    queryRows<ChildForGrowthRecord>(`select id, posyandu_id, alamat, jenis_kelamin, nama_anak, nama_ayah, nama_ibu,
      nik_anak, nik_ortu, tanggal_lahir from balita where ${childWhere}
      order by nama_anak limit $7 offset $8`, [...childParams, limit, offset]),
    queryOne<{ count: number }>(`select count(*)::int as count from balita where ${childWhere}`, childParams),
    queryRows<GrowthTrendMeasurement>(`select balita_id, periode_bulan::text as periode_bulan,
      berat_badan::float8 as berat_badan, tinggi_badan::float8 as tinggi_badan,
      lingkar_kepala::float8 as lingkar_kepala, lingkar_lengan::float8 as lingkar_lengan
      from tumbuh_kembang_balita where posyandu_id = $1
      and periode_bulan >= $2::date and periode_bulan < $3::date
      and (berat_badan is not null or tinggi_badan is not null or lingkar_kepala is not null or lingkar_lengan is not null)
      order by periode_bulan desc`, [posyanduId, periodStart, periodEnd]),
  ]);
  const count = countRow?.count ?? 0;
  const recordedCount = new Set(recordedRows.map((record) => record.balita_id)).size;
  const emptyGrowthTrends = {
    weightUp: 0,
    weightDown: 0,
    heightUp: 0,
    weightUpChange: 0,
    weightDownChange: 0,
    heightUpChange: 0,
  };

  if (!children.length) {
    return {
      data: [],
      error: null,
      count,
      recordedCount,
      growthTrends: emptyGrowthTrends,
    };
  }

  const childIds = children.map((child) => child.id);
  const recordedChildIds = [...new Set(recordedRows.map((record) => record.balita_id))];
  const historyStart = new Date(Date.UTC(year - 1, month - 1, 1)).toISOString();
  const previousMonthStart = new Date(Date.UTC(year, month - 2, 1)).toISOString();
  const [measurements, previousMeasurements] = await Promise.all([
    queryRows<GrowthRecordWithCreator>(`select r.id, r.balita_id, r.posyandu_id,
      r.periode_bulan::text as periode_bulan, r.tanggal_pengukuran::text as tanggal_pengukuran,
      r.berat_badan::float8 as berat_badan, r.tinggi_badan::float8 as tinggi_badan,
      r.lingkar_kepala::float8 as lingkar_kepala, r.lingkar_lengan::float8 as lingkar_lengan,
      r.catatan, r.created_by, p.nama as created_by_name, r.created_at, r.updated_at
      from tumbuh_kembang_balita r
      left join petugas p on p.id = r.created_by and p.posyandu_id = r.posyandu_id
      where r.posyandu_id = $1 and r.balita_id = any($2::uuid[]) order by r.periode_bulan desc`, [posyanduId, pgUuidArray(childIds)]),
    recordedChildIds.length > 0
      ? queryRows<GrowthTrendMeasurement>(`select balita_id, periode_bulan::text as periode_bulan,
          berat_badan::float8 as berat_badan, tinggi_badan::float8 as tinggi_badan,
          lingkar_kepala::float8 as lingkar_kepala, lingkar_lengan::float8 as lingkar_lengan
          from tumbuh_kembang_balita where posyandu_id = $1 and balita_id = any($2::uuid[])
          and periode_bulan >= $3::date and periode_bulan < $4::date order by periode_bulan desc`,
          [posyanduId, pgUuidArray(recordedChildIds), historyStart, periodStart])
      : Promise.resolve([] as GrowthTrendMeasurement[]),
  ]);

  const measurementByChild = new Map<string, GrowthRecordWithCreator>();
  for (const measurement of measurements) {
    if (!isSamePeriod(measurement.periode_bulan, month, year)) continue;
    if (!measurementByChild.has(measurement.balita_id)) {
      measurementByChild.set(measurement.balita_id, measurement);
    }
  }
  const previousMetricsByChild = getPreviousMetricsByChild(
    measurements.filter((measurement) => {
      const timestamp = getPeriodTimestamp(measurement.periode_bulan) ?? -1;
      return timestamp >= (getPeriodTimestamp(previousMonthStart) ?? 0)
        && timestamp < (getPeriodTimestamp(periodStart) ?? 0);
    }),
  );
  const lastMetricsByChild = getLastMetricsByChild(
    measurements.filter(
      (measurement) => (getPeriodTimestamp(measurement.periode_bulan) ?? -1)
        < (getPeriodTimestamp(periodStart) ?? 0),
    ),
  );

  return {
    data: children.map((child) =>
      redactGrowthRecordSensitiveData(toListViewModel(
        child,
        measurementByChild.get(child.id),
        periodStart,
        previousMetricsByChild.get(child.id),
        lastMetricsByChild.get(child.id),
      ), role),
    ),
    error: null,
    count,
    recordedCount,
    growthTrends: calculatePeriodGrowthTrends(
      recordedRows,
      previousMeasurements,
      previousMonthStart,
      periodStart,
    ),
  };
}

function getPreviousMetricsByChild(measurements: GrowthTrendMeasurement[]) {
  const metrics = new Map<string, { weight: number | null; height: number | null; head: number | null; arm: number | null }>();
  for (const measurement of measurements) {
    const current = metrics.get(measurement.balita_id) ?? { weight: null, height: null, head: null, arm: null };
    if (current.weight === null && measurement.berat_badan !== null) {
      current.weight = Number(measurement.berat_badan);
    }
    if (current.height === null && measurement.tinggi_badan !== null) {
      current.height = Number(measurement.tinggi_badan);
    }
    if (current.head === null && measurement.lingkar_kepala != null) {
      current.head = Number(measurement.lingkar_kepala);
    }
    if (current.arm === null && measurement.lingkar_lengan != null) {
      current.arm = Number(measurement.lingkar_lengan);
    }
    metrics.set(measurement.balita_id, current);
  }
  return metrics;
}

function getLastMetricsByChild(measurements: GrowthTrendMeasurement[]) {
  const metrics = new Map<string, LastGrowthMeasurements>();

  for (const measurement of measurements) {
    const current = metrics.get(measurement.balita_id) ?? createEmptyLastMeasurements();
    if (current.berat_badan === null && measurement.berat_badan !== null) {
      current.berat_badan = {
        value: Number(measurement.berat_badan),
        periode_bulan: measurement.periode_bulan,
      };
    }
    if (current.tinggi_badan === null && measurement.tinggi_badan !== null) {
      current.tinggi_badan = {
        value: Number(measurement.tinggi_badan),
        periode_bulan: measurement.periode_bulan,
      };
    }
    if (current.lingkar_kepala === null && measurement.lingkar_kepala !== null) {
      current.lingkar_kepala = {
        value: Number(measurement.lingkar_kepala),
        periode_bulan: measurement.periode_bulan,
      };
    }
    if (current.lingkar_lengan === null && measurement.lingkar_lengan !== null) {
      current.lingkar_lengan = {
        value: Number(measurement.lingkar_lengan),
        periode_bulan: measurement.periode_bulan,
      };
    }
    metrics.set(measurement.balita_id, current);
  }

  return metrics;
}

function createEmptyLastMeasurements(): LastGrowthMeasurements {
  return {
    berat_badan: null,
    tinggi_badan: null,
    lingkar_kepala: null,
    lingkar_lengan: null,
  };
}

function calculatePeriodGrowthTrends(
  currentMeasurements: GrowthTrendMeasurement[],
  history: GrowthTrendMeasurement[],
  previousPeriodStart: string,
  currentPeriodStart: string,
) {
  const previousStartTimestamp = getPeriodTimestamp(previousPeriodStart) ?? 0;
  const currentStartTimestamp = getPeriodTimestamp(currentPeriodStart) ?? 0;
  const previousMeasurements = history.filter(
    (measurement) => {
      const timestamp = getPeriodTimestamp(measurement.periode_bulan) ?? -1;
      return timestamp >= previousStartTimestamp && timestamp < currentStartTimestamp;
    },
  );
  const historyBeforePrevious = history.filter(
    (measurement) => (getPeriodTimestamp(measurement.periode_bulan) ?? -1) < previousStartTimestamp,
  );
  return withGrowthTrendChanges(
    calculateGrowthTrends(currentMeasurements, history),
    calculateGrowthTrends(previousMeasurements, historyBeforePrevious),
  );
}

export async function findGrowthRecordById(id: string) {
  const { posyanduId, role } = await getAuthenticatedPetugas();
  const data = await queryOne<GrowthRecordRow>(`select r.id, r.balita_id, r.posyandu_id,
    r.periode_bulan::text as periode_bulan, r.tanggal_pengukuran::text as tanggal_pengukuran,
    r.berat_badan::float8 as berat_badan, r.tinggi_badan::float8 as tinggi_badan,
    r.lingkar_kepala::float8 as lingkar_kepala, r.lingkar_lengan::float8 as lingkar_lengan,
    r.catatan, r.created_by, p.nama as created_by_name, r.created_at, r.updated_at,
    json_build_object('alamat', b.alamat, 'jenis_kelamin', b.jenis_kelamin, 'nama_anak', b.nama_anak,
      'nama_ayah', b.nama_ayah, 'nama_ibu', b.nama_ibu, 'nik_anak', b.nik_anak,
      'nik_ortu', b.nik_ortu, 'tanggal_lahir', b.tanggal_lahir) as balita
    from tumbuh_kembang_balita r
    join balita b on b.id = r.balita_id
    left join petugas p on p.id = r.created_by and p.posyandu_id = r.posyandu_id
    where r.id = $1 and r.posyandu_id = $2`, [id, posyanduId]);
  return databaseResult(data ? redactGrowthRecordSensitiveData(toViewModel(data), role) : null);
}

export async function createGrowthRecord(record: GrowthRecordInput) {
  const { petugasId, posyanduId } = await getAuthenticatedPetugasForWrite();
  const child = await queryOne<{ id: string }>(`select id from balita
    where id = $1 and posyandu_id = $2
    and (inactive_at is null or inactive_at::date >= $3::date)`,
    [record.balita_id, posyanduId, record.periode_bulan.slice(0, 10)]);
  if (!child) throw new Error("Data balita tidak ditemukan.");
  const data = await insertRow<GrowthRecordModel>(tableName, { ...record, posyandu_id: posyanduId, created_by: petugasId }, growthRecordColumns);
  return databaseResult(data);
}

export async function updateGrowthRecordById(id: string, record: GrowthRecordUpdateInput) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  const data = await updateRow<GrowthRecordModel>(tableName, { ...record, updated_at: new Date().toISOString() }, growthRecordColumns, { id, posyandu_id: posyanduId });
  return databaseResult(data);
}

export async function deleteGrowthRecordById(id: string) {
  const { posyanduId } = await getAuthenticatedPetugasForWrite();
  return databaseResult(await deleteRow<{ id: string }>(tableName, { id, posyandu_id: posyanduId }));
}

function toListViewModel(
  child: ChildForGrowthRecord,
  measurement: GrowthRecordWithCreator | undefined,
  periodStart: string,
  previousMetrics?: { weight: number | null; height: number | null; head: number | null; arm: number | null },
  lastMetrics?: LastGrowthMeasurements,
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
    perubahan_berat_badan: calculateMetricChange(measurement?.berat_badan, previousMetrics?.weight),
    perubahan_tinggi_badan: calculateMetricChange(measurement?.tinggi_badan, previousMetrics?.height),
    lingkar_kepala: measurement?.lingkar_kepala ?? null,
    lingkar_lengan: measurement?.lingkar_lengan ?? null,
    perubahan_lingkar_kepala: calculateMetricChange(measurement?.lingkar_kepala, previousMetrics?.head),
    perubahan_lingkar_lengan: calculateMetricChange(measurement?.lingkar_lengan, previousMetrics?.arm),
    pengukuran_terakhir: lastMetrics ?? createEmptyLastMeasurements(),
    catatan: measurement?.catatan ?? null,
    created_by: measurement?.created_by ?? null,
    created_by_name: measurement?.created_by_name ?? null,
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
    perubahan_berat_badan: null,
    perubahan_tinggi_badan: null,
    lingkar_kepala: record.lingkar_kepala,
    lingkar_lengan: record.lingkar_lengan,
    perubahan_lingkar_kepala: null,
    perubahan_lingkar_lengan: null,
    pengukuran_terakhir: createEmptyLastMeasurements(),
    catatan: record.catatan,
    created_by: record.created_by,
    created_by_name: record.created_by_name,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function calculateMetricChange(current?: number | null, previous?: number | null) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  return Math.round((Number(current) - Number(previous)) * 100) / 100;
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
