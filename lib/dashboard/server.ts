import "server-only";

import type { DashboardData } from "@/components/dashboard/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { calculateGrowthTrends, getPeriodTimestamp, type GrowthTrendMeasurement, withGrowthTrendChanges } from "@/lib/growth-trend";
import { getAuthenticatedPetugas } from "@/lib/user/server";

type DashboardChild = {
  id: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string | null;
};

type DashboardMeasurement = {
  balita_id: string;
  periode_bulan: string;
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
  const { supabase, posyanduId } = await getAuthenticatedPetugas();

  const [posyanduResult, cadreResult, childrenResult, measurementsResult, latestTrendPeriodResult] = await Promise.all([
    supabase
      .from("posyandu")
      .select("nama_posyandu, rt, rw, nama_kelurahan, nama_kecamatan")
      .eq("id", posyanduId)
      .single(),
    supabase
      .from("petugas")
      .select("id", { count: "exact", head: true })
      .eq("posyandu_id", posyanduId)
      .eq("jenis_petugas", "kader"),
    supabase
      .from("balita")
      .select("id, jenis_kelamin, tanggal_lahir")
      .eq("posyandu_id", posyanduId)
      .or(`tanggal_lahir.is.null,tanggal_lahir.gte.${oldestBirthDate}`),
    supabase
      .from("tumbuh_kembang_balita")
      .select("balita_id, periode_bulan")
      .eq("posyandu_id", posyanduId)
      .gte("periode_bulan", yearStart)
      .lt("periode_bulan", nextYearStart)
      .or("berat_badan.not.is.null,tinggi_badan.not.is.null,lingkar_kepala.not.is.null,lingkar_lengan.not.is.null")
      .order("periode_bulan", { ascending: true }),
    supabase
      .from("tumbuh_kembang_balita")
      .select("periode_bulan")
      .eq("posyandu_id", posyanduId)
      .lt("periode_bulan", trendSearchEnd)
      .not("berat_badan", "is", null)
      .order("periode_bulan", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (posyanduResult.error) throw posyanduResult.error;
  if (cadreResult.error) throw cadreResult.error;
  if (childrenResult.error) throw childrenResult.error;
  if (measurementsResult.error) throw measurementsResult.error;
  if (latestTrendPeriodResult.error) throw latestTrendPeriodResult.error;

  const latestTrendPeriod = latestTrendPeriodResult.data?.periode_bulan ?? null;
  const trendPeriods = latestTrendPeriod ? createTrendPeriods(latestTrendPeriod) : null;
  const trendHistoryResult = trendPeriods
    ? await supabase
        .from("tumbuh_kembang_balita")
        .select("balita_id, periode_bulan, berat_badan, tinggi_badan")
        .eq("posyandu_id", posyanduId)
        .gte("periode_bulan", trendPeriods.historyStart)
        .lt("periode_bulan", trendPeriods.currentEnd)
        .or("berat_badan.not.is.null,tinggi_badan.not.is.null")
        .order("periode_bulan", { ascending: false })
    : { data: [], error: null };
  if (trendHistoryResult.error) throw trendHistoryResult.error;

  const ageGroups = {
    infantMale: 0,
    infantFemale: 0,
    childMale: 0,
    childFemale: 0,
  };
  for (const child of (childrenResult.data ?? []) as DashboardChild[]) {
    const age = getAgeInMonths(child.tanggal_lahir, referenceDate);
    if (age === null || age > 60) continue;
    if (age <= 12) {
      if (child.jenis_kelamin === "L") ageGroups.infantMale += 1;
      else ageGroups.infantFemale += 1;
    } else if (child.jenis_kelamin === "L") ageGroups.childMale += 1;
    else ageGroups.childFemale += 1;
  }

  const childrenByMonth = Array.from({ length: 12 }, () => new Set<string>());
  const measurements = (measurementsResult.data ?? []) as DashboardMeasurement[];
  for (const measurement of measurements) {
    if (getYear(measurement.periode_bulan) !== year) continue;
    const month = getMonth(measurement.periode_bulan);
    if (month !== null) childrenByMonth[month - 1].add(measurement.balita_id);
  }

  const growthTrends = trendPeriods
    ? calculateTrendSummary(
        (trendHistoryResult.data ?? []) as GrowthTrendMeasurement[],
        trendPeriods.currentStart,
        trendPeriods.previousStart,
      )
    : emptyGrowthTrendSummary();
  const posyandu = posyanduResult.data as DashboardPosyandu;

  return {
    year,
    generatedAt: new Date().toISOString(),
    posyandu: {
      name: posyandu.nama_posyandu,
      rt: posyandu.rt,
      rw: posyandu.rw,
      village: posyandu.nama_kelurahan,
      district: posyandu.nama_kecamatan,
      cadreCount: cadreResult.count ?? 0,
    },
    totalChildren: childrenResult.data?.length ?? 0,
    ageGroups,
    growthTrends,
    growthTrendPeriod: latestTrendPeriod,
    monthlyWeighings: childrenByMonth.map((children, index) => ({ month: index + 1, count: children.size })),
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

function getMonth(value: string) {
  const match = value.match(/^\d{4}-(\d{1,2})/);
  if (match) {
    const month = Number(match[1]);
    return month >= 1 && month <= 12 ? month : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCMonth() + 1;
}

function getYear(value: string) {
  const match = value.match(/^(\d{4})-/);
  if (match) return Number(match[1]);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}
