"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ChildForm } from "@/components/children/child-form";
import { ChildCard } from "@/components/children/child-card";
import { ChildRow } from "@/components/children/child-row";
import type { Child } from "@/components/children/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { useCurrentUser } from "@/components/user/user-provider";
import {
  getAllChildren,
  getChildren,
  removeChild,
  updateChild,
} from "@/lib/children/api";
import { exportChildrenToExcel } from "@/lib/children/export";

const pageSize = 10;
const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function ChildrenManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<Child[]>([]);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
  const previousSearchRef = useRef(debouncedQuery);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const requestedMonth = Number(searchParams.get("month") ?? String(today.getMonth() + 1));
  const requestedYear = Number(searchParams.get("year") ?? String(today.getFullYear()));
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
    ? requestedMonth
    : today.getMonth() + 1;
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : today.getFullYear();
  const referenceDate = new Date(year, month, 0);
  const monthOptions = monthNames.map((name, index) => ({ label: name, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const option = today.getFullYear() - index;
    return { label: String(option), value: String(option) };
  });

  useEffect(() => {
    if (!searchParams.has("page")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      router.replace(`/children?${params}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/children?${params}`);
  }

  function changePeriod(nextMonth: number, nextYear: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    params.set("page", "1");
    router.push(`/children?${params}`);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getChildren(page, pageSize, debouncedQuery, month, year);
          setChildren(result.data);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Data balita gagal dimuat.",
          );
        } finally {
          setIsLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [debouncedQuery, month, page, reloadKey, year]);

  useEffect(() => {
    if (previousSearchRef.current === debouncedQuery) return;

    previousSearchRef.current = debouncedQuery;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    router.replace(`/children?${params}`);
  }, [debouncedQuery, router, searchParams]);

  function openEditForm(child: Child) {
    setEditingChild(child);
    setIsFormOpen(true);
  }

  async function exportChildren() {
    setIsExporting(true);
    setError(null);
    try {
      exportChildrenToExcel(await getAllChildren(month, year), {
        includeSensitiveData: canManage,
      });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Data balita gagal diekspor.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function deleteChild(child: Child) {
    if (!window.confirm(`Hapus data ${child.nama_anak}?`)) return;
    try {
      await removeChild(child.id);
      if (children.length === 1 && page > 1) changePage(page - 1);
      else setReloadKey((value) => value + 1);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Data balita gagal dihapus.",
      );
    }
  }

  async function saveChild(child: Child) {
    const payload = Object.fromEntries(
      Object.entries(child).filter(
        ([key]) => !["id", "created_by", "created_by_name", "created_at", "registered_at", "updated_at"].includes(key),
      ),
    ) as Omit<Child, "id" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at">;
    await updateChild(child.id, payload);
    setIsFormOpen(false);
    setReloadKey((value) => value + 1);
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">MANAJEMEN DATA</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Data Balita
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Kelola data balita yang terdaftar di Posyandu Anda.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled={isExporting} onClick={() => void exportChildren()} size="md" variant="outline">
            {isExporting ? "Mengekspor..." : "Export Laporan"}
          </Button>
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-5 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-text-primary">Daftar Balita</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {total} balita terdaftar
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:w-auto lg:grid-cols-[9rem_7rem_18rem]">
            <SearchableSelect ariaLabel="Pilih bulan" className="w-full" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
            <SearchableSelect ariaLabel="Pilih tahun" className="w-full" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
            <label className="relative block sm:col-span-2 lg:col-span-1">
              <span className="sr-only">Cari data balita</span>
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none placeholder:text-text-disabled focus:border-primary focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={canManage ? "Cari nama, NIK, atau Posyandu" : "Cari nama atau Posyandu"}
                value={query}
              />
            </label>
          </div>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {children.map((child) => (
            <ChildCard
              child={child}
              key={child.id}
              onDelete={deleteChild}
              onEdit={openEditForm}
              onOpen={() => router.push(`/children/${child.id}`)}
              readOnly={!canManage}
              referenceDate={referenceDate}
              showSensitiveData={canManage}
            />
          ))}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full text-left">
            <thead className="bg-background text-[11px] font-bold tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2.5">NAMA ANAK</th>
                <th className="px-3 py-2.5">NIK ANAK</th>
                <th className="px-3 py-2.5">JENIS KELAMIN</th>
                <th className="px-3 py-2.5">USIA</th>
                <th className="px-3 py-2.5">RT</th>
                <th className="px-3 py-2.5">RW</th>
                <th className="px-3 py-2.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {children.map((child) => (
                <ChildRow
                  child={child}
                  key={child.id}
                  onDelete={deleteChild}
                  onEdit={openEditForm}
                  readOnly={!canManage}
                  referenceDate={referenceDate}
                  showSensitiveData={canManage}
                />
              ))}
            </tbody>
          </table>
        </div>
        {error && (
          <p className="px-5 py-4 text-sm font-medium text-error">{error}</p>
        )}
        {isLoading && (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">
            Memuat data balita...
          </p>
        )}
        {!isLoading && !error && children.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="font-bold text-text-primary">
              Data balita tidak ditemukan
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Coba kata kunci lain atau tambahkan data balita baru.
            </p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center gap-2 border-t border-border px-4 py-3 text-sm">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <Button
                  aria-current={pageNumber === page ? "page" : undefined}
                  disabled={isLoading}
                  key={pageNumber}
                  onClick={() => changePage(pageNumber)}
                  size="sm"
                  variant={pageNumber === page ? "primary" : "outline"}
                >
                  {pageNumber}
                </Button>
              ),
            )}
          </div>
        )}
      </section>
      {canManage && isFormOpen && (
        <ChildForm
          child={editingChild}
          onClose={() => setIsFormOpen(false)}
          onSave={saveChild}
        />
      )}
    </main>
  );
}
