import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { request } from "@/lib/http/request";

export type GrowthRecordInput = {
  balita_id: string;
  periode_bulan: string;
  tanggal_pengukuran: string | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
  catatan: string | null;
};
export type GrowthRecordUpdateInput = Partial<
  Omit<GrowthRecordInput, "balita_id" | "periode_bulan">
>;

export type PaginatedGrowthRecords = {
  data: GrowthRecordViewModel[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  recordedCount: number;
};

export function getGrowthRecords(page = 1, limit = 10, month?: number, year?: number, search?: string) {
  const searchParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (month) searchParams.set("month", String(month));
  if (year) searchParams.set("year", String(year));
  if (search?.trim()) searchParams.set("q", search.trim());
  return request<PaginatedGrowthRecords>(`/api/growth-record?${searchParams}`);
}

export async function getAllGrowthRecords(month: number, year: number) {
  const firstPage = await getGrowthRecords(1, 100, month, year);
  if (firstPage.totalPages <= 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      getGrowthRecords(index + 2, 100, month, year),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((result) => result.data);
}

export function getGrowthRecordById(id: string) {
  return request<GrowthRecordViewModel>(`/api/growth-record/${id}`);
}

export function createGrowthRecord(record: GrowthRecordInput) {
  return request<GrowthRecordViewModel>("/api/growth-record", {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export function updateGrowthRecord(id: string, record: GrowthRecordUpdateInput) {
  return request<GrowthRecordViewModel>(`/api/growth-record/${id}`, {
    method: "PATCH",
    body: JSON.stringify(record),
  });
}

export function removeGrowthRecord(id: string) {
  return request<{ message: string }>(`/api/growth-record/${id}`, { method: "DELETE" });
}
