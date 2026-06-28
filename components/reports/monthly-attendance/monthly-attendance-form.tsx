"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { MonthlyAttendanceReport } from "@/components/reports/monthly-attendance/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Form, FormField } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  getMonthlyAttendanceReport,
  getReportOfficers,
  saveMonthlyAttendanceReport,
} from "@/lib/reports/monthly-attendance/api";
import type { ReportOfficer } from "@/lib/reports/monthly-attendance/server";

const numberFields = [
  ["total_wus", "Wanita Usia Subur"],
  ["total_pus", "Pasangan Usia Subur"],
  ["total_ibu_hamil", "Ibu Hamil"],
  ["total_ibu_menyusui", "Ibu Menyusui"],
  ["total_pria_plkb", "PLKB Laki-laki"],
  ["total_wanita_plkb", "PLKB Perempuan"],
  ["total_pria_medis", "Medis Laki-laki"],
  ["total_wanita_medis", "Medis Perempuan"],
  ["total_balita_lahir", "Balita Lahir"],
  ["total_balita_meninggal", "Balita Meninggal"],
] as const;

type NumberField = typeof numberFields[number][0];

export function MonthlyAttendanceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [period, setPeriod] = useState(() => normalizeInitialPeriod(searchParams.get("period"), today));
  const [officers, setOfficers] = useState<ReportOfficer[]>([]);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<MonthlyAttendanceReport | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(
    Object.fromEntries(numberFields.map(([name]) => [name, "0"])) as Record<NumberField, string>,
  );

  useEffect(() => {
    let active = true;
    void getReportOfficers().then((data) => { if (active) setOfficers(data); }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Daftar kader gagal dimuat."); }).finally(() => { if (active) setIsLoadingOfficers(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const [year, month] = period.split("-").map(Number);
    if (!year || !month) return;
    void getMonthlyAttendanceReport(month, year).then((data) => {
      if (!active) return;
      setAttendance(data);
      if (data.savedReport) {
        setSelectedOfficerIds(data.savedReport.id_petugas);
        setNumbers(Object.fromEntries(numberFields.map(([name]) => [name, String(data.savedReport?.[name] ?? 0)])) as Record<NumberField, string>);
      } else {
        setSelectedOfficerIds([]);
        setNumbers(createEmptyNumbers());
      }
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Informasi balita gagal dimuat."); }).finally(() => { if (active) setIsLoadingInfo(false); });
    return () => { active = false; };
  }, [period]);

  function updateNumber(name: string, value: string) {
    setNumbers((current) => ({ ...current, [name]: value }));
  }

  function changePeriod(value: string) {
    setIsLoadingInfo(true);
    setAttendance(null);
    setPeriod(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedOfficerIds.length === 0) {
      setError("Pilih minimal satu kader yang hadir.");
      return;
    }
    setIsConfirmOpen(true);
  }

  async function persistReport() {
    setIsSaving(true);
    setError(null);
    try {
      await saveMonthlyAttendanceReport({
        periode: period,
        id_petugas: selectedOfficerIds,
        ...Object.fromEntries(numberFields.map(([name]) => [name, toNonNegativeInteger(numbers[name])])) as Record<NumberField, number>,
      });
      const [year, month] = period.split("-");
      setIsConfirmOpen(false);
      router.push(`/reports/monthly-attendance?month=${Number(month)}&year=${year}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Laporan gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  const isEditMode = Boolean(attendance?.savedReport);

  return <Form onSubmit={handleSubmit}>
    <div className="border-b border-border p-6">
      <FormField className="max-w-sm" label="Periode laporan" name="periode" onChange={(event) => changePeriod(event.target.value)} required type="month" value={period} />
      <p className="mt-2 text-xs text-text-secondary">Pilih periode terlebih dahulu agar informasi penimbangan balita dapat dimuat.</p>
    </div>

    <div className="border-b border-border p-6">
      <h2 className="font-extrabold text-text-primary">Informasi Balita</h2>
      <p className="mt-1 text-sm text-text-secondary">Data ini dihitung otomatis dari pencatatan pertumbuhan dan tidak perlu diisi.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ReadOnlyCount isLoading={isLoadingInfo} label="Total Menimbang" value={attendance?.totalAttended ?? 0} />
        <ReadOnlyCount isLoading={isLoadingInfo} label="Balita Baru" value={attendance?.totalNew ?? 0} />
        <ReadOnlyCount isLoading={isLoadingInfo} label="Balita Lama" value={attendance?.totalExisting ?? 0} />
      </div>
    </div>

    <div className="grid gap-5 p-6 sm:grid-cols-2">
      <label className="block text-sm font-semibold text-text-primary sm:col-span-2">Kader yang hadir<div className="mt-2"><MultiSelect disabled={isLoadingOfficers} emptyMessage="Kader tidak ditemukan" onValueChange={setSelectedOfficerIds} options={officers.map((officer) => ({ description: officer.jenis_kelamin === "L" ? "Laki-laki" : officer.jenis_kelamin === "P" ? "Perempuan" : "Jenis kelamin belum diisi", label: officer.nama, value: officer.id }))} placeholder="Pilih kader yang hadir" searchPlaceholder="Cari nama kader..." selectedLabel="kader" value={selectedOfficerIds} /></div></label>
      {numberFields.map(([name, label]) => <FormField key={name} label={label} min="0" name={name} onValueChange={updateNumber} required step="1" type="number" value={numbers[name]} />)}
    </div>
    {error && <p className="px-6 pb-4 text-sm font-medium text-error">{error}</p>}
    <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
      <Button onClick={() => router.push("/reports/monthly-attendance")} type="button" variant="outline">Batal</Button>
      <Button disabled={isLoadingInfo} type="submit">{isEditMode ? "Simpan Perubahan" : "Tambah Laporan"}</Button>
    </div>
    <ConfirmationDialog confirmLabel={isEditMode ? "Ya, Simpan" : "Ya, Tambah"} description={<>Pastikan data laporan periode <strong className="text-text-primary">{formatPeriodLabel(period)}</strong> sudah benar.</>} isLoading={isSaving} isOpen={isConfirmOpen} onCancel={() => setIsConfirmOpen(false)} onConfirm={() => void persistReport()} title={isEditMode ? "Simpan perubahan laporan?" : "Tambah laporan baru?"} />
  </Form>;
}

function ReadOnlyCount({ isLoading, label, value }: { isLoading: boolean; label: string; value: number }) {
  return <div className="rounded-xl bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-2 text-2xl font-extrabold text-primary">{isLoading ? "…" : value}</p></div>;
}

function toNonNegativeInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createEmptyNumbers() {
  return Object.fromEntries(numberFields.map(([name]) => [name, "0"])) as Record<NumberField, string>;
}

function normalizeInitialPeriod(value: string | null, fallback: Date) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : formatMonth(fallback);
}

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1));
}
