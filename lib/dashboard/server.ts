import "server-only";

import type { DashboardData } from "@/components/dashboard/types";
import { getOldestDisplayedBirthDate } from "@/lib/children/server";
import { getAuthenticatedPetugas } from "@/lib/user/server";

type DashboardChild = {
  id: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string | null;
};

export async function getDashboardData(year: number): Promise<DashboardData> {
  const now = new Date();
  const referenceMonth = now.getMonth() + 1;
  const referenceYear = now.getFullYear();
  const referenceDate = new Date(Date.UTC(referenceYear, referenceMonth, 0));
  const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1)).toISOString();
  const oldestBirthDate = getOldestDisplayedBirthDate(referenceMonth, referenceYear);
  const { supabase, posyanduId } = await getAuthenticatedPetugas();

  const [childrenResult, measurementsResult] = await Promise.all([
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
      .or("berat_badan.not.is.null,tinggi_badan.not.is.null,lingkar_kepala.not.is.null,lingkar_lengan.not.is.null"),
  ]);

  if (childrenResult.error) throw childrenResult.error;
  if (measurementsResult.error) throw measurementsResult.error;

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
  for (const measurement of measurementsResult.data ?? []) {
    const month = getMonth(measurement.periode_bulan);
    if (month !== null) childrenByMonth[month - 1].add(measurement.balita_id);
  }

  return {
    year,
    generatedAt: new Date().toISOString(),
    ageGroups,
    monthlyWeighings: childrenByMonth.map((children, index) => ({ month: index + 1, count: children.size })),
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
