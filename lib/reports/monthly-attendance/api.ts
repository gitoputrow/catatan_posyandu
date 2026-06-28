import type { MonthlyAttendanceReport } from "@/components/reports/monthly-attendance/types";
import { request } from "@/lib/http/request";
import type { MonthlyAttendanceInput, ReportOfficer } from "@/lib/reports/monthly-attendance/server";

export function getMonthlyAttendanceReport(month: number, year: number) {
  const searchParams = new URLSearchParams({ month: String(month), year: String(year) });
  return request<MonthlyAttendanceReport>(`/api/reports/monthly-attendance?${searchParams}`);
}

export function getReportOfficers() {
  return request<ReportOfficer[]>("/api/reports/monthly-attendance/officers");
}

export function createMonthlyAttendanceReport(report: MonthlyAttendanceInput) {
  return request<{ id: string; periode: string }>("/api/reports/monthly-attendance", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

export function saveMonthlyAttendanceReport(report: MonthlyAttendanceInput) {
  return request<{ id: string; periode: string; mode: "created" | "updated" }>("/api/reports/monthly-attendance", {
    method: "PUT",
    body: JSON.stringify(report),
  });
}
