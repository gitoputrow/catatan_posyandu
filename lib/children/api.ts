import type { Child, Kelurahan, Posyandu } from "@/components/children/types";
import { request } from "@/lib/http/request";

export type PaginatedChildren = {
  data: Child[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ChildInput = Omit<
  Child,
  "id" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at"
>;

export function getChildren(page = 1, limit = 10, search?: string, month?: number, year?: number) {
  const searchParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search?.trim()) searchParams.set("q", search.trim());
  if (month) searchParams.set("month", String(month));
  if (year) searchParams.set("year", String(year));
  return request<PaginatedChildren>(`/api/balita?${searchParams}`);
}

export async function getAllChildren(month?: number, year?: number) {
  const firstPage = await getChildren(1, 100, undefined, month, year);
  if (firstPage.totalPages === 1) return firstPage.data;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) => getChildren(index + 2, 100, undefined, month, year)),
  );
  return [firstPage.data, ...remainingPages.map((result) => result.data)].flat();
}

export function getChildById(id: string) {
  return request<Child>(`/api/balita/${id}`);
}

export function createChild(child: ChildInput) {
  return request<Child>("/api/balita", {
    method: "POST",
    body: JSON.stringify(child),
  });
}

export function updateChild(id: string, child: ChildInput) {
  return request<Child>(`/api/balita/${id}`, {
    method: "PATCH",
    body: JSON.stringify(child),
  });
}

export function removeChild(id: string) {
  return request<{ message: string }>(`/api/balita/${id}`, { method: "DELETE" });
}

export function getKelurahan() {
  return request<Kelurahan[]>("/api/kelurahan");
}

export function getPosyandu(kelurahanId?: string) {
  const query = kelurahanId ? `?kelurahan_id=${encodeURIComponent(kelurahanId)}` : "";
  return request<Posyandu[]>(`/api/posyandu${query}`);
}
