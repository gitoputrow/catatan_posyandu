"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { GrowthTrendSummary, type GrowthTrendData } from "@/components/dashboard/growth-trend-summary";
import { GrowthRecordActions, GrowthRecordCard } from "@/components/growth-record/growth-record-card";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { MetricChange } from "@/components/ui/metric-change";
import { useCurrentUser } from "@/components/user/user-provider";
import {
  createGrowthRecord,
  getAllGrowthRecords,
  getGrowthRecords,
  removeGrowthRecord,
  updateGrowthRecord,
} from "@/lib/growth-record/api";
import { exportGrowthRecordsToExcel } from "@/lib/growth-record/export";
import { getUser } from "@/lib/user/api";

const pageSize = 10;
const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function GrowthRecordManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPage = Number(searchParams.get("page") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const today = new Date();
  const requestedMonth = Number(searchParams.get("month") ?? String(today.getMonth() + 1));
  const requestedYear = Number(searchParams.get("year") ?? String(today.getFullYear()));
  const [month, setMonth] = useState(
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : today.getMonth() + 1,
  );
  const [year, setYear] = useState(
    Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : today.getFullYear(),
  );
  const [records, setRecords] = useState<GrowthRecordViewModel[]>([]);
  const [recordedCount, setRecordedCount] = useState(0);
  const [growthTrends, setGrowthTrends] = useState<GrowthTrendData | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get("q") ?? "");
  const [editingRecord, setEditingRecord] = useState<GrowthRecordViewModel | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const previousSearchRef = useRef(debouncedQuery);
  const monthOptions = monthNames.map((name, index) => ({ label: name, value: String(index + 1) }));
  const yearOptions = Array.from(
    { length: 6 },
    (_, index) => {
      const option = today.getFullYear() - index;
      return { label: String(option), value: String(option) };
    },
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getGrowthRecords(page, pageSize, month, year, debouncedQuery);
          setRecords(result.data);
          setRecordedCount(result.recordedCount);
          setGrowthTrends(result.growthTrends);
          setTotalPages(result.totalPages);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Data pertumbuhan gagal dimuat.",
          );
        } finally {
          setIsLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [debouncedQuery, month, page, reloadKey, year]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    if (previousSearchRef.current === debouncedQuery) return;

    previousSearchRef.current = debouncedQuery;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    router.replace(`/growth-recording?${params}`);
  }, [debouncedQuery, router, searchParams]);

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    params.set("month", String(month));
    params.set("year", String(year));
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    router.push(`/growth-recording?${params}`);
  }

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    if (debouncedQuery) params.set("q", debouncedQuery);
    else params.delete("q");
    router.push(`/growth-recording?${params}`);
  }

  function openRecordForm(record: GrowthRecordViewModel) {
    setEditingRecord(record);
    setError(null);
  }

  async function saveGrowthRecord(values: GrowthRecordFormValues) {
    if (!editingRecord) return;

    setIsSavingRecord(true);
    setError(null);
    try {
      if (editingRecord.id) {
        await updateGrowthRecord(editingRecord.id, values);
      } else {
        await createGrowthRecord({
          ...values,
          balita_id: editingRecord.balita_id,
          periode_bulan: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
        });
      }
      setEditingRecord(null);
      setReloadKey((value) => value + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Catatan pertumbuhan gagal disimpan.");
    } finally {
      setIsSavingRecord(false);
    }
  }

  async function deleteGrowthRecord(record: GrowthRecordViewModel) {
    if (!record.id) return;
    if (!window.confirm(`Hapus catatan pertumbuhan ${record.nama}?`)) return;

    setError(null);
    try {
      await removeGrowthRecord(record.id);
      setReloadKey((value) => value + 1);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Catatan pertumbuhan gagal dihapus.");
    }
  }

  async function exportGrowthRecords() {
    setIsExporting(true);
    setError(null);
    try {
      const [recordsToExport, user] = await Promise.all([
        getAllGrowthRecords(month, year),
        getUser(),
      ]);

      exportGrowthRecordsToExcel({
        includeSensitiveData: canManage,
        records: recordsToExport,
        month,
        year,
        posyanduName: user.nama_posyandu,
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Data pertumbuhan gagal diekspor.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">PEMANTAUAN BALITA</p>
          <h1 className="mt-1 max-w-2xl text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Pencatatan Pertumbuhan
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            Catat dan pantau hasil pengukuran pertumbuhan balita setiap bulan.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <Button className="w-full sm:w-auto" disabled={isExporting} onClick={() => void exportGrowthRecords()} size="md" variant="outline">
            {isExporting ? "Mengekspor..." : "Export Laporan"}
          </Button>
        </div>
      </header>

      <section className="mt-8">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">Periode data</p>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-fit sm:grid-cols-[10rem_8rem]">
          <SearchableSelect ariaLabel="Pilih bulan" className="w-full" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
          <SearchableSelect ariaLabel="Pilih tahun" className="w-full" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
        </div>
      </section>

      <GrowthTrendSummary
        isLoading={isLoading}
        periodLabel={`${monthNames[month - 1]} ${year}`}
        trends={growthTrends}
      />

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col gap-5 border-b border-border px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-text-primary">Data Pertumbuhan</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {recordedCount} balita melakukan pencatatan
            </p>
          </div>
          <div className="w-full lg:w-72">
            <label className="relative block">
              <span className="sr-only">Cari data pertumbuhan</span>
              <input
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text-primary outline-none placeholder:text-text-disabled focus:border-primary focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama balita"
                value={query}
              />
            </label>
          </div>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {records.map((record) => (
            <GrowthRecordCard
              key={record.id ?? record.balita_id}
              onAdd={() => openRecordForm(record)}
              onDelete={() => void deleteGrowthRecord(record)}
              onEdit={() => openRecordForm(record)}
              readOnly={!canManage}
              record={record}
              referenceDate={new Date(year, month, 0)}
            />
          ))}
        </div>
        <div className="hidden overflow-x-auto px-2 lg:block">
          <table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-background text-[12px] font-bold tracking-wide text-text-secondary">
              <tr>
                <th className="px-2 py-2.5">NAMA</th>
                <th className="px-2 py-2.5">JENIS KELAMIN</th>
                <th className="px-2 py-2.5">USIA</th>
                <th className="px-2 py-2.5">BERAT BADAN</th>
                <th className="px-2 py-2.5">TINGGI BADAN</th>
                <th className="px-2 py-2.5">LINGKAR KEPALA</th>
                <th className="px-2 py-2.5">LINGKAR LENGAN</th>
                <th className="px-2 py-2.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => (
                <GrowthRecordRow
                  key={record.id ?? record.balita_id}
                  onAdd={() => openRecordForm(record)}
                  onDelete={() => void deleteGrowthRecord(record)}
                  onEdit={() => openRecordForm(record)}
                  readOnly={!canManage}
                  record={record}
                  referenceDate={new Date(year, month, 0)}
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
            Memuat data pertumbuhan...
          </p>
        )}
        {!isLoading && !error && records.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="font-bold text-text-primary">
              Data pertumbuhan belum tersedia
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Catatan pengukuran balita akan tampil di sini.
            </p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center gap-1 border-t border-border px-2 py-3 text-sm">
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
      {canManage && editingRecord && (
        <GrowthRecordEditor
          isSaving={isSavingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={saveGrowthRecord}
          record={editingRecord}
        />
      )}
    </main>
  );
}

type GrowthRecordFormValues = {
  tanggal_pengukuran: string | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
  catatan: string | null;
};

function GrowthRecordRow({
  onAdd,
  onDelete,
  onEdit,
  readOnly,
  record,
  referenceDate,
}: {
  onAdd: () => void;
  onDelete: () => void;
  onEdit: () => void;
  readOnly: boolean;
  record: GrowthRecordViewModel;
  referenceDate: Date;
}) {
  return (
    <tr className="text-sm text-text-primary">
      <td className="px-3 py-3 font-bold">{record.nama}</td>
      <td className="px-3 py-3 text-xs">
        {record.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}
      </td>
      <td className="px-3 py-3 text-xs font-medium">
        {getAgeInMonths(record.tanggal_lahir, referenceDate)}
      </td>
      <MetricCell change={record.perubahan_berat_badan} value={record.berat_badan} unit="kg" />
      <MetricCell change={record.perubahan_tinggi_badan} value={record.tinggi_badan} unit="cm" />
      <MetricCell change={record.perubahan_lingkar_kepala} value={record.lingkar_kepala} unit="cm" />
      <MetricCell change={record.perubahan_lingkar_lengan} value={record.lingkar_lengan} unit="cm" />
      <td className="px-3 py-3">
        <GrowthRecordActions onAdd={onAdd} onDelete={onDelete} onEdit={onEdit} readOnly={readOnly} record={record} />
      </td>
    </tr>
  );
}


function GrowthRecordEditor({
  isSaving,
  onClose,
  onSave,
  record,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSave: (values: GrowthRecordFormValues) => Promise<void>;
  record: GrowthRecordViewModel;
}) {
  const [form, setForm] = useState({
    tanggal_pengukuran: toDateInputValue(record.tanggal_pengukuran) || formatInputDate(new Date()),
    berat_badan: valueToInput(record.berat_badan),
    tinggi_badan: valueToInput(record.tinggi_badan),
    lingkar_kepala: valueToInput(record.lingkar_kepala),
    lingkar_lengan: valueToInput(record.lingkar_lengan),
    catatan: record.catatan ?? "",
  });

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      tanggal_pengukuran: form.tanggal_pengukuran || null,
      berat_badan: toNumberOrNull(form.berat_badan),
      tinggi_badan: toNumberOrNull(form.tinggi_badan),
      lingkar_kepala: toNumberOrNull(form.lingkar_kepala),
      lingkar_lengan: toNumberOrNull(form.lingkar_lengan),
      catatan: form.catatan.trim() || null,
    });
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-text-primary/45 p-4" role="dialog">
      <form className="w-full max-w-2xl overflow-hidden rounded-2xl bg-surface shadow-lg" onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-primary">PENCATATAN PERTUMBUHAN</p>
            <h2 className="text-xl font-extrabold text-text-primary">
              {record.id ? "Edit Catatan" : "Tambah Catatan"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{record.nama}</p>
          </div>
          <button aria-label="Tutup form" className="grid size-9 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-background" onClick={onClose} type="button">×</button>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <InputField label="Tanggal pengukuran" name="tanggal_pengukuran" onChange={updateField} type="date" value={form.tanggal_pengukuran} />
          <InputField label="Berat badan (kg)" name="berat_badan" onChange={updateField} step="0.01" type="number" value={form.berat_badan} />
          <InputField label="Tinggi badan (cm)" name="tinggi_badan" onChange={updateField} step="0.1" type="number" value={form.tinggi_badan} />
          <InputField label="Lingkar kepala (cm)" name="lingkar_kepala" onChange={updateField} step="0.1" type="number" value={form.lingkar_kepala} />
          <InputField label="Lingkar lengan (cm)" name="lingkar_lengan" onChange={updateField} step="0.1" type="number" value={form.lingkar_lengan} />
          <label className="block text-sm font-semibold text-text-primary sm:col-span-2">
            Catatan
            <textarea className="mt-2 min-h-24 w-full rounded-lg border border-border bg-surface px-3 py-2 font-normal text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" onChange={(event) => updateField("catatan", event.target.value)} value={form.catatan} />
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button onClick={onClose} type="button" variant="outline">Batal</Button>
          <Button isLoading={isSaving} type="submit">{record.id ? "Simpan Perubahan" : "Tambah Catatan"}</Button>
        </div>
      </form>
    </div>
  );
}

function InputField({
  label,
  name,
  onChange,
  step,
  type,
  value,
}: {
  label: string;
  name: string;
  onChange: (name: string, value: string) => void;
  step?: string;
  type: "date" | "number";
  value: string;
}) {
  return (
    <label className="block text-sm font-semibold text-text-primary">
      {label}
      <input
        className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 font-normal text-text-primary outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        min={type === "number" ? "0" : undefined}
        name={name}
        onChange={(event) => onChange(name, event.target.value)}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function MetricCell({ change, value, unit }: { change?: number | null; value: number | null; unit: string }) {
  return (
    <td className="px-3 py-3 text-xs font-semibold">
      {value === null ? "-" : `${value} ${unit}`}
      <MetricChange change={change} unit={unit} />
    </td>
  );
}

function valueToInput(value: number | null) {
  return value === null ? "" : String(value);
}

function toNumberOrNull(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getAgeInMonths(value: string, referenceDate: Date) {
  if (!value) return "-";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "-";
  const months =
    (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 +
    referenceDate.getMonth() -
    birthDate.getMonth() -
    (referenceDate.getDate() < birthDate.getDate() ? 1 : 0);
  return `${Math.max(0, months)} bln`;
}
