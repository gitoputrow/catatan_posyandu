"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  GrowthHistoryChild,
  GrowthHistoryMeasurement,
} from "@/components/growth-history/types";
import { GrowthHistoryCard } from "@/components/growth-history/growth-history-card";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { MetricChange } from "@/components/ui/metric-change";
import { useCurrentUser } from "@/components/user/user-provider";
import { getGrowthHistory } from "@/lib/growth-history/api";
import {
  exportAllGrowthHistories,
  exportSelectedGrowthHistory,
  historyMonthNames,
} from "@/lib/growth-history/export";

export function GrowthHistoryManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const initialMonth = parseMonth(searchParams.get("month"), today.getMonth() + 1);
  const initialYear = parseYear(searchParams.get("year"), today.getFullYear());
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [children, setChildren] = useState<GrowthHistoryChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState(searchParams.get("childId") ?? "");
  const [measurements, setMeasurements] = useState<GrowthHistoryMeasurement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingChild, setIsExportingChild] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedChild = children.find((child) => child.id === selectedChildId) ?? null;
  const measurementByMonth = useMemo(() => {
    const map = new Map<number, GrowthHistoryMeasurement>();
    for (const measurement of measurements) {
      const date = new Date(measurement.periode_bulan);
      if (!Number.isNaN(date.getTime())) map.set(date.getUTCMonth() + 1, measurement);
    }
    return map;
  }, [measurements]);

  const monthOptions = historyMonthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });
  const childOptions = children.map((child) => ({ label: child.nama, value: child.id }));

  useEffect(() => {
    let isActive = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getGrowthHistory(month, year, selectedChildId || undefined);
        if (!isActive) return;
        setChildren(result.children);
        setSelectedChildId(result.selectedChildId ?? "");
        setMeasurements(result.measurements);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Riwayat pertumbuhan gagal dimuat.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, [month, selectedChildId, year]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    setSelectedChildId("");
    updateUrl(nextMonth, nextYear);
  }

  function changeChild(childId: string) {
    setSelectedChildId(childId);
    updateUrl(month, year, childId);
  }

  function updateUrl(nextMonth: number, nextYear: number, childId?: string) {
    const params = new URLSearchParams();
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    if (childId) params.set("childId", childId);
    router.replace(`/growth-recording/history?${params}`);
  }

  function exportSelected() {
    if (!selectedChild) return;
    setIsExportingChild(true);
    try {
      exportSelectedGrowthHistory(selectedChild, measurements, month, year);
    } finally {
      setIsExportingChild(false);
    }
  }

  async function exportAll() {
    setIsExportingAll(true);
    setError(null);
    try {
      const result = await getGrowthHistory(month, year, undefined, true);
      exportAllGrowthHistories(result.children, result.measurements, month, year, {
        includeSensitiveData: canManage,
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Semua riwayat pertumbuhan gagal diekspor.");
    } finally {
      setIsExportingAll(false);
    }
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">PEMANTAUAN BALITA</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Riwayat Pertumbuhan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Pantau perubahan berat dan tinggi badan balita dari bulan ke bulan.</p>
        </div>
        <Button disabled={children.length === 0 || isExportingAll} onClick={() => void exportAll()} variant="outline">
          {isExportingAll ? "Mengekspor..." : "Export Semua Historis"}
        </Button>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[10rem_8rem_minmax(15rem,1fr)]">
          <SearchableSelect ariaLabel="Pilih bulan" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
          <SearchableSelect ariaLabel="Pilih tahun" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
          <SearchableSelect ariaLabel="Pilih balita" onValueChange={changeChild} options={childOptions} placeholder="Pilih balita" value={selectedChildId} />
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-bold text-text-primary">{selectedChild?.nama ?? "Riwayat Balita"}</h2>
            <p className="mt-1 text-sm text-text-secondary">Januari–{historyMonthNames[month - 1]} {year}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button disabled={!selectedChild || isLoading || isExportingChild} onClick={exportSelected} variant="outline">
              {isExportingChild ? "Mengekspor..." : "Export Data Historis"}
            </Button>
          </div>
        </div>

        {isLoading && <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat riwayat pertumbuhan...</p>}
        {!isLoading && error && <p className="px-5 py-5 text-sm font-medium text-error">{error}</p>}
        {!isLoading && !error && !selectedChild && <p className="px-5 py-14 text-center text-sm text-text-secondary">Belum ada balita pada periode ini.</p>}
        {!isLoading && !error && selectedChild && (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {Array.from({ length: month }, (_, index) => {
                const currentMonth = index + 1;
                const measurement = measurementByMonth.get(currentMonth);
                const previousMeasurement = measurementByMonth.get(currentMonth - 1);
                return <GrowthHistoryCard armChange={calculateChange(measurement?.lingkar_lengan, previousMeasurement?.lingkar_lengan)} headChange={calculateChange(measurement?.lingkar_kepala, previousMeasurement?.lingkar_kepala)} heightChange={calculateChange(measurement?.tinggi_badan, previousMeasurement?.tinggi_badan)} key={index} measurement={measurement} month={currentMonth} weightChange={calculateChange(measurement?.berat_badan, previousMeasurement?.berat_badan)} />;
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs font-bold tracking-wide text-text-secondary">
                  <tr><th className="px-5 py-3">BULAN</th><th className="px-5 py-3">BERAT BADAN</th><th className="px-5 py-3">TINGGI BADAN</th><th className="px-5 py-3">LINGKAR LENGAN</th><th className="px-5 py-3">LINGKAR KEPALA</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.from({ length: month }, (_, index) => {
                    const currentMonth = index + 1;
                    const measurement = measurementByMonth.get(currentMonth);
                    const previousMeasurement = measurementByMonth.get(currentMonth - 1);
                    return (
                      <tr key={currentMonth}>
                        <td className="px-5 py-4 font-bold text-text-primary">{historyMonthNames[index]}</td>
                        <MetricCell change={calculateChange(measurement?.berat_badan, previousMeasurement?.berat_badan)} unit="kg" value={measurement?.berat_badan} />
                        <MetricCell change={calculateChange(measurement?.tinggi_badan, previousMeasurement?.tinggi_badan)} unit="cm" value={measurement?.tinggi_badan} />
                        <MetricCell change={calculateChange(measurement?.lingkar_lengan, previousMeasurement?.lingkar_lengan)} unit="cm" value={measurement?.lingkar_lengan} />
                        <MetricCell change={calculateChange(measurement?.lingkar_kepala, previousMeasurement?.lingkar_kepala)} unit="cm" value={measurement?.lingkar_kepala} />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function MetricCell({ change, unit, value }: { change?: number | null; unit: string; value?: number | null }) {
  return <td className="px-5 py-4 font-medium text-text-primary">{value != null ? `${value} ${unit}` : "-"}<MetricChange change={change} unit={unit} /></td>;
}

function calculateChange(current?: number | null, previous?: number | null) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null;
  return Math.round((Number(current) - Number(previous)) * 100) / 100;
}

function parseMonth(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback;
}

function parseYear(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 2000 && number <= 2100 ? number : fallback;
}
