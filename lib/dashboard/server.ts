import "server-only";

import type { DashboardData } from "@/components/dashboard/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { calculateGrowthTrends, getPeriodTimestamp, type GrowthTrendMeasurement, withGrowthTrendChanges } from "@/lib/growth-trend";
import { queryOne, queryRows } from "@/lib/neon/query";
import { getAuthenticatedPetugas } from "@/lib/user/server";

type DashboardChild = {
  id: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string | null;
};

type DashboardMonthlyWeighing = {
  month: number;
  count: number;
};

type DashboardPosyandu = {
  nama_posyandu: string | null;
  rt: string | null;
  rw: string | null;
  nama_kelurahan: string | null;
  nama_kecamatan: string | null;
};

export async function getDashboardData(year: number): Promise<DashboardData> {
  const now = new Date();
  const referenceMonth = now.getMonth() + 1;
  const referenceYear = now.getFullYear();
  const referenceDate = new Date(Date.UTC(referenceYear, referenceMonth, 0));
  const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
  const trendSearchEnd = new Date(Date.UTC(referenceYear, referenceMonth, 1)).toISOString();
  const oldestBirthDate = getOldestDisplayedBirthDate(referenceMonth, referenceYear);
  const { posyanduId } = await getAuthenticatedPetugas();

  const [posyandu, cadreCount, children, monthlyWeighings, latestTrendPeriodRow] = await Promise.all([
    queryOne<DashboardPosyandu>("select nama_posyandu, rt, rw, nama_kelurahan, nama_kecamatan from posyandu where id = $1", [posyanduId]),
    queryOne<{ count: number }>("select count(*)::int as count from petugas where posyandu_id = $1 and lower(jenis_petugas) = 'kader' and is_active = true", [posyanduId]),
    queryRows<DashboardChild>("select id, jenis_kelamin, tanggal_lahir::text as tanggal_lahir from balita where posyandu_id = $1 and (tanggal_lahir is null or tanggal_lahir >= $2::date)", [posyanduId, oldestBirthDate]),
    queryRows<DashboardMonthlyWeighing>(`select extract(month from periode_bulan)::int as month,
        count(distinct balita_id)::int as count
      from tumbuh_kembang_balita
      where posyandu_id = $1 and periode_bulan >= $2::date and periode_bulan < $3::date
        and (berat_badan is not null or tinggi_badan is not null or lingkar_kepala is not null or lingkar_lengan is not null)
      group by extract(month from periode_bulan)
      order by month`, [posyanduId, yearStart, nextYearStart]),
    queryOne<{ periode_bulan: string }>(`select periode_bulan::text as periode_bulan from tumbuh_kembang_balita
      where posyandu_id = $1 and periode_bulan < $2::date and berat_badan is not null
      order by periode_bulan desc limit 1`, [posyanduId, trendSearchEnd]),
  ]);

  if (!posyandu) throw new Error("Data Posyandu tidak ditemukan.");

  const latestTrendPeriod = latestTrendPeriodRow?.periode_bulan ?? null;
  const trendPeriods = latestTrendPeriod ? createTrendPeriods(latestTrendPeriod) : null;
  const trendHistoryResult = trendPeriods
    ? await queryRows<GrowthTrendMeasurement>(`select balita_id, periode_bulan::text as periode_bulan,
        berat_badan::float8 as berat_badan, tinggi_badan::float8 as tinggi_badan
      from tumbuh_kembang_balita where posyandu_id = $1
        and periode_bulan >= $2::date and periode_bulan < $3::date
        and (berat_badan is not null or tinggi_badan is not null)
      order by periode_bulan desc`, [posyanduId, trendPeriods.historyStart, trendPeriods.currentEnd])
    : [];

  const ageGroups = {
    infantMale: 0,
    infantFemale: 0,
    childMale: 0,
    childFemale: 0,
  };
  for (const child of children) {
    const age = getAgeInMonths(child.tanggal_lahir, referenceDate);
    if (age === null || age > 60) continue;
    if (age <= 12) {
      if (child.jenis_kelamin === "L") ageGroups.infantMale += 1;
      else ageGroups.infantFemale += 1;
    } else if (child.jenis_kelamin === "L") ageGroups.childMale += 1;
    else ageGroups.childFemale += 1;
  }

  const growthTrends = trendPeriods
    ? calculateTrendSummary(
        trendHistoryResult,
        trendPeriods.currentStart,
        trendPeriods.previousStart,
      )
    : emptyGrowthTrendSummary();
  return {
    year,
    generatedAt: new Date().toISOString(),
    posyandu: {
      name: posyandu.nama_posyandu,
      rt: posyandu.rt,
      rw: posyandu.rw,
      village: posyandu.nama_kelurahan,
      district: posyandu.nama_kecamatan,
      cadreCount: cadreCount?.count ?? 0,
    },
    totalChildren: children.length,
    ageGroups,
    growthTrends,
    growthTrendPeriod: latestTrendPeriod,
    monthlyWeighings: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      count: monthlyWeighings.find((item) => item.month === index + 1)?.count ?? 0,
    })),
  };
}

function createTrendPeriods(value: string) {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    currentStart: new Date(Date.UTC(year, month, 1)).toISOString(),
    currentEnd: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
    previousStart: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    historyStart: new Date(Date.UTC(year - 1, month - 1, 1)).toISOString(),
  };
}

function calculateTrendSummary(
  measurements: GrowthTrendMeasurement[],
  currentStart: string,
  previousStart: string,
) {
  const currentStartTimestamp = getPeriodTimestamp(currentStart) ?? 0;
  const previousStartTimestamp = getPeriodTimestamp(previousStart) ?? 0;
  const current = measurements.filter(
    (measurement) => (getPeriodTimestamp(measurement.periode_bulan) ?? -1) >= currentStartTimestamp,
  );
  const history = measurements.filter(
    (measurement) => (getPeriodTimestamp(measurement.periode_bulan) ?? -1) < currentStartTimestamp,
  );
  const previous = measurements.filter(
    (measurement) => {
      const timestamp = getPeriodTimestamp(measurement.periode_bulan) ?? -1;
      return timestamp >= previousStartTimestamp && timestamp < currentStartTimestamp;
    },
  );
  const historyBeforePrevious = measurements.filter(
    (measurement) => (getPeriodTimestamp(measurement.periode_bulan) ?? -1) < previousStartTimestamp,
  );
  return withGrowthTrendChanges(
    calculateGrowthTrends(current, history),
    calculateGrowthTrends(previous, historyBeforePrevious),
  );
}

function emptyGrowthTrendSummary() {
  return {
    weightUp: 0,
    weightDown: 0,
    heightUp: 0,
    weightUpChange: 0,
    weightDownChange: 0,
    heightUpChange: 0,
  };
}

function getAgeInMonths(value: string | null, referenceDate: Date) {
  if (!value) return null;
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;
  return Math.max(0, (referenceDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 + referenceDate.getUTCMonth() - birthDate.getUTCMonth() - (referenceDate.getUTCDate() < birthDate.getUTCDate() ? 1 : 0));
}
