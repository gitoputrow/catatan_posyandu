import type { MonthlyResultsOverview } from "@/components/reports/monthly-results/types";
import { request } from "@/lib/http/request";
import type { MonthlyResultsInput } from "@/lib/reports/monthly-results/server";

export function getMonthlyResultsReport(month: number, year: number) {
  const searchParams = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  return request<MonthlyResultsOverview>(`/api/reports/monthly-results?${searchParams}`);
}

export function saveMonthlyResultsReport(report: MonthlyResultsInput) {
  return request<{ id: string; periode: string; mode: "created" | "updated" }>("/api/reports/monthly-results", {
    method: "PUT",
    body: JSON.stringify(report),
  });
}
