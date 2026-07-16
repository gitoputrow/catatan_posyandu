import type { ChildActivitySummary } from "@/components/children/activity-summary-types";
import { request } from "@/lib/http/request";

export function getChildActivitySummary(month: number, year: number) {
  return request<ChildActivitySummary>(`/api/children/activity-summary?month=${month}&year=${year}`);
}
