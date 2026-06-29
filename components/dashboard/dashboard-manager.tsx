"use client";

import { useEffect, useState } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { MonthlyWeighingChart } from "@/components/dashboard/monthly-weighing-chart";
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
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Dashboard gagal dimuat."); })
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

      <DashboardSummary data={data} isLoading={isLoading} />
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
