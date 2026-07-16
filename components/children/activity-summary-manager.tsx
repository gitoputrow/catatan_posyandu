"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { ChildPeriodSummary } from "@/components/children/child-period-summary";
import { MonthlyWeighingChart } from "@/components/dashboard/monthly-weighing-chart";
import type { ChildActivitySummary } from "@/components/children/activity-summary-types";
import { SearchableSelect } from "@/components/ui/form";
import { getChildActivitySummary } from "@/lib/children/activity-summary/api";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ActivitySummaryManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const month = parseMonth(searchParams.get("month"), today.getMonth() + 1);
  const year = parseYear(searchParams.get("year"), today.getFullYear());
  const [data, setData] = useState<ChildActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = monthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });

  useEffect(() => {
    let active = true;
    void getChildActivitySummary(month, year)
      .then((result) => { if (active) setData(result); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Aktivitas balita gagal dimuat."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [month, year]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setIsLoading(true);
    setError(null);
    router.replace(`/children/activity-summary?${new URLSearchParams({ month: String(nextMonth), year: String(nextYear) })}`);
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">MANAJEMEN AKTIVITAS</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Aktivitas Balita</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_7rem]">
          <SearchableSelect ariaLabel="Pilih bulan aktivitas" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
          <SearchableSelect ariaLabel="Pilih tahun aktivitas" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">{error}</p>}
      <DashboardSummary data={data} isLoading={isLoading} showFeaturedMeta={false} total={data?.totalChildren} />
      <ChildPeriodSummary data={data} isLoading={isLoading} periodLabel={`${monthNames[month - 1]} ${year}`} />
      <MonthlyWeighingChart chartAriaLabel="Grafik garis pertambahan data balita bulanan" data={data?.monthlyRegistrations ?? []} description={null} isLoading={isLoading} onYearChange={(value) => changePeriod(month, Number(value))} showYearFilter={false} title="Pertambahan Data Balita" year={year} yearOptions={yearOptions} />
    </main>
  );
}

function parseMonth(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback;
}

function parseYear(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 2000 && number <= 2100 ? number : fallback;
}
