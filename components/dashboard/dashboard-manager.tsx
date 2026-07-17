"use client";

import { useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { GrowthTrendSummary } from "@/components/dashboard/growth-trend-summary";
import { MonthlyWeighingChart } from "@/components/dashboard/monthly-weighing-chart";
import { PosyanduInformation } from "@/components/dashboard/posyandu-information";
import type { DashboardData } from "@/components/dashboard/types";
import { getDashboardData } from "@/lib/dashboard/api";

export function DashboardManager() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = currentYear - index;
    return { label: String(value), value: String(value) };
  });

  useEffect(() => {
    let active = true;
    void getDashboardData(year)
      .then((result) => { if (active) setData(result); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Ringkasan aktivitas gagal dimuat."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [year]);

  function changeYear(value: string) {
    setIsLoading(true);
    setError(null);
    setYear(Number(value));
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <DashboardHeader />

      {error && (
        <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">
          {error}
        </p>
      )}

      <PosyanduInformation data={data?.posyandu} isLoading={isLoading} />
      <DashboardSummary
        data={data}
        isLoading={isLoading}
        showAgeGroups={false}
        total={data?.totalChildren}
      />
      <GrowthTrendSummary
        description="Menggunakan bulan penimbangan terbaru dan dibandingkan dengan pencatatan sebelumnya."
        isLoading={isLoading}
        periodLabel={formatPeriod(data?.growthTrendPeriod)}
        trends={data?.growthTrends ?? null}
      />
      <MonthlyWeighingChart
        data={data?.monthlyWeighings ?? []}
        isLoading={isLoading}
        onYearChange={changeYear}
        year={year}
        yearOptions={yearOptions}
      />
    </main>
  );
}

function formatPeriod(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
