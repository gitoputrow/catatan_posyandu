import type { MonthlyActivityOverview } from "@/components/reports/monthly-activity/types";
import { request } from "@/lib/http/request";
import type { MonthlyActivityInput } from "@/lib/reports/monthly-activity/server";

export function getMonthlyActivityReport(month: number, year: number) {
  const searchParams = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  return request<MonthlyActivityOverview>(`/api/reports/monthly-activity?${searchParams}`);
}

export function saveMonthlyActivityReport(report: MonthlyActivityInput) {
  return request<{ id: string; periode: string; mode: "created" | "updated" }>("/api/reports/monthly-activity", {
    method: "PUT",
    body: JSON.stringify(report),
  });
}
