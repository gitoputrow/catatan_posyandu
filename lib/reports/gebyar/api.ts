import type { GebyarReport } from "@/components/reports/gebyar/types";
import { request } from "@/lib/http/request";
import type { GebyarReportInput } from "@/lib/reports/gebyar/server";

export function getGebyarReport(month: number, year: number) {
  const searchParams = new URLSearchParams({ month: String(month), year: String(year) });
  return request<GebyarReport>(`/api/reports/gebyar?${searchParams}`);
}

export function saveGebyarReport(report: GebyarReportInput) {
  return request<{ id: string; periode: string; mode: "created" | "updated" }>("/api/reports/gebyar", {
    body: JSON.stringify(report),
    method: "PUT",
  });
}
