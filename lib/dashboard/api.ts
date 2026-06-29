import type { DashboardData } from "@/components/dashboard/types";
import { request } from "@/lib/http/request";

export function getDashboardData(year: number) {
  return request<DashboardData>(`/api/dashboard?year=${year}`);
}
