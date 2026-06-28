import type { GrowthHistoryResponse } from "@/components/growth-history/types";
import { request } from "@/lib/http/request";

export function getGrowthHistory(
  month: number,
  year: number,
  childId?: string,
  includeAllChildren = false,
) {
  const searchParams = new URLSearchParams({ month: String(month), year: String(year) });
  if (childId) searchParams.set("childId", childId);
  if (includeAllChildren) searchParams.set("all", "true");
  return request<GrowthHistoryResponse>(`/api/growth-history?${searchParams}`);
}
