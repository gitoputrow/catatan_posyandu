"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { InformationGroup } from "@/components/reports/monthly-attendance/information-group";
import type { MonthlyAttendanceReport } from "@/components/reports/monthly-attendance/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { getMonthlyAttendanceReport } from "@/lib/reports/monthly-attendance/api";
import { exportMonthlyAttendanceReport } from "@/lib/reports/monthly-attendance/export";
import { getUser } from "@/lib/user/api";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function MonthlyAttendanceManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => parseMonth(searchParams.get("month"), today.getMonth() + 1));
  const [year, setYear] = useState(() => parseYear(searchParams.get("year"), today.getFullYear()));
  const [report, setReport] = useState<MonthlyAttendanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = monthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });

  useEffect(() => {
    let isActive = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getMonthlyAttendanceReport(month, year);
        if (isActive) setReport(result);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Laporan kehadiran gagal dimuat.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, [month, year]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    const params = new URLSearchParams({ month: String(nextMonth), year: String(nextYear) });
    router.replace(`/reports/monthly-attendance?${params}`);
  }

  async function exportReport() {
    if (!report?.savedReport) return;
    setIsExporting(true);
    setError(null);
    try {
      exportMonthlyAttendanceReport(report, await getUser());
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Laporan gagal diekspor.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Kehadiran Bulanan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Jumlah balita yang melakukan penimbangan, dikelompokkan berdasarkan status pendaftaran, usia, dan jenis kelamin.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_8rem]"><SearchableSelect ariaLabel="Pilih bulan" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} /><SearchableSelect ariaLabel="Pilih tahun" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} /></div>
          <Button disabled={!report?.savedReport || isExporting} onClick={() => void exportReport()} variant="outline">{isExporting ? "Mengekspor..." : "Export"}</Button>
          <Button disabled={isLoading} onClick={() => router.push(`/reports/monthly-attendance/create?period=${year}-${String(month).padStart(2, "0")}`)}>{report?.savedReport ? "Edit" : "Tambah"}</Button>
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">{error}</p>}

      <section className="mt-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ringkasan Kegiatan</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Informasi Posyandu</h2>
          <p className="mt-1 text-sm text-text-secondary">Data pendukung kegiatan pada {monthNames[month - 1]} {year}.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-12 lg:items-stretch">
          <InformationGroup
            className="lg:col-span-4"
            description="Data sasaran keluarga bulan ini"
            icon={<FamilyIcon />}
            isLoading={isLoading}
            items={[
              ["Wanita Usia Subur", report?.information.totalWus ?? 0],
              ["Pasangan Usia Subur", report?.information.totalPus ?? 0],
              ["Ibu Hamil", report?.information.totalPregnantWomen ?? 0],
              ["Ibu Menyusui", report?.information.totalBreastfeedingMothers ?? 0],
            ]}
            title="Sasaran Keluarga"
            variant="primary"
          />
          <InformationGroup
            className="lg:col-span-5"
            description="Kader dan tenaga pendamping"
            icon={<OfficerIcon />}
            isLoading={isLoading}
            items={[
              ["Kader Laki-laki", report?.information.totalMaleCadres ?? 0],
              ["Kader Perempuan", report?.information.totalFemaleCadres ?? 0],
              ["PLKB Laki-laki", report?.information.totalMalePlkb ?? 0],
              ["PLKB Perempuan", report?.information.totalFemalePlkb ?? 0],
              ["Medis Laki-laki", report?.information.totalMaleMedicalStaff ?? 0],
              ["Medis Perempuan", report?.information.totalFemaleMedicalStaff ?? 0],
            ]}
            title="Petugas Pendukung"
            variant="secondary"
          />
          <InformationGroup
            className="lg:col-span-3"
            description="Kelahiran dan kematian balita"
            icon={<ChildEventIcon />}
            isLoading={isLoading}
            items={[
              ["Balita Lahir", report?.information.totalChildrenBorn ?? 0],
              ["Balita Meninggal", report?.information.totalChildrenDied ?? 0],
            ]}
            title="Peristiwa Balita"
            variant="accent"
          />
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-bold text-text-primary">Rekap {monthNames[month - 1]} {year}</h2>
          <p className="mt-1 text-sm text-text-secondary">Balita dihitung satu kali meskipun memiliki lebih dari satu catatan pada bulan yang sama.</p>
        </div>

        {isLoading ? <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat laporan kehadiran...</p> : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {report?.rows.map((row) => <AttendanceCard key={`${row.ageGroup}-${row.gender}`} row={row} />)}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-xs font-bold tracking-wide text-text-secondary">
                  <tr><th className="px-5 py-3">KELOMPOK USIA</th><th className="px-5 py-3">JENIS KELAMIN</th><th className="px-5 py-3 text-center">BARU</th><th className="px-5 py-3 text-center">LAMA</th><th className="px-5 py-3 text-center">TOTAL</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report?.rows.map((row) => <tr key={`${row.ageGroup}-${row.gender}`}><td className="px-5 py-4 font-bold text-text-primary">{row.ageLabel}</td><td className="px-5 py-4 text-text-primary">{row.genderLabel}</td><CountCell value={row.newChildren} /><CountCell value={row.existingChildren} /><CountCell emphasized value={row.total} /></tr>)}
                </tbody>
                <tfoot className="border-t-2 border-border bg-background font-extrabold text-text-primary">
                  <tr><td className="px-5 py-4" colSpan={2}>TOTAL</td><CountCell value={report?.totalNew ?? 0} /><CountCell value={report?.totalExisting ?? 0} /><CountCell emphasized value={(report?.totalNew ?? 0) + (report?.totalExisting ?? 0)} /></tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
        {!isLoading && Boolean(report?.unclassified) && <p className="border-t border-border px-5 py-4 text-xs font-medium text-text-secondary">{report?.unclassified} balita belum masuk kelompok usia karena tanggal lahir kosong, tidak valid, atau usia lebih dari 60 bulan.</p>}
      </section>
    </main>
  );
}

function FamilyIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}

function OfficerIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4" /></svg>;
}

function ChildEventIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 00-.1-7.8z" /></svg>;
}

function AttendanceCard({ row }: { row: MonthlyAttendanceReport["rows"][number] }) {
  return <article className="rounded-xl border border-border p-4"><div><h3 className="font-extrabold text-text-primary">{row.ageLabel}</h3><p className="mt-1 text-xs text-text-secondary">{row.genderLabel}</p></div><div className="mt-4 grid grid-cols-3 gap-2"><SmallCount label="Baru" value={row.newChildren} /><SmallCount label="Lama" value={row.existingChildren} /><SmallCount label="Total" value={row.total} /></div></article>;
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-background p-3 text-center"><p className="text-[10px] font-bold uppercase text-text-secondary">{label}</p><p className="mt-1 text-lg font-extrabold text-text-primary">{value}</p></div>;
}

function CountCell({ emphasized = false, value }: { emphasized?: boolean; value: number }) {
  return <td className={`px-5 py-4 text-center ${emphasized ? "font-extrabold text-primary" : "font-semibold text-text-primary"}`}>{value}</td>;
}

function parseMonth(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback;
}

function parseYear(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 2000 && number <= 2100 ? number : fallback;
}
