"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  MonthlyResultsGroupedCount,
  MonthlyResultsOverview,
} from "@/components/reports/monthly-results/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { useCurrentUser } from "@/components/user/user-provider";
import { getMonthlyResultsReport } from "@/lib/reports/monthly-results/api";
import { exportMonthlyResultsReport } from "@/lib/reports/monthly-results/export";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function MonthlyResultsManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => parseMonth(searchParams.get("month"), today.getMonth() + 1));
  const [year, setYear] = useState(() => parseYear(searchParams.get("year"), today.getFullYear()));
  const [overview, setOverview] = useState<MonthlyResultsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedChairId, setSelectedChairId] = useState("");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = monthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });

  useEffect(() => {
    let active = true;
    void getMonthlyResultsReport(month, year)
      .then((result) => { if (active) setOverview(result); })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Kegiatan penimbangan gagal dimuat.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [month, year]);

  useEffect(() => {
    if (!isExportDialogOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isExportDialogOpen]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setIsLoading(true);
    setError(null);
    setMonth(nextMonth);
    setYear(nextYear);
    router.replace(`/reports/monthly-results?${new URLSearchParams({ month: String(nextMonth), year: String(nextYear) })}`);
  }

  async function exportReport() {
    if (!overview || !selectedChairId || !signatureFile) {
      setError("Pilih nama ketua dan unggah foto tanda tangan terlebih dahulu.");
      return;
    }
    const chair = overview.cadres.list.find((cadre) => cadre.id === selectedChairId);
    if (!chair) { setError("Ketua Posyandu harus dipilih dari daftar kader."); return; }
    if (signatureFile.size > 5 * 1024 * 1024) { setError("Ukuran foto tanda tangan maksimal 5 MB."); return; }
    setIsExporting(true);
    setError(null);
    try {
      await exportMonthlyResultsReport(overview, chair.name, signatureFile);
      setIsExportDialogOpen(false);
      setSelectedChairId("");
      setSignatureFile(null);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Kegiatan penimbangan gagal diekspor.");
    } finally {
      setIsExporting(false);
    }
  }

  const address = overview?.address;
  const breastfeeding = overview?.exclusiveBreastfeeding;
  const weighing = overview?.weighingActivities;

  return (
    <>
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Kegiatan Penimbangan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Laporan kegiatan penimbangan Posyandu dalam satu periode bulanan.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_8rem]">
            <SearchableSelect ariaLabel="Pilih bulan" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
            <SearchableSelect ariaLabel="Pilih tahun" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
          </div>
          <Button disabled={!overview || isLoading || isExporting} onClick={() => { setError(null); setIsExportDialogOpen(true); }} variant="outline">Export Laporan</Button>
          {canManage && (
            <Button
              disabled={isLoading}
              onClick={() => router.push(`/reports/monthly-results/create?period=${year}-${String(month).padStart(2, "0")}`)}
            >
              {overview?.savedReport ? "Edit" : "Tambah"}
            </Button>
          )}
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Alamat Posyandu</p>
        </div>
        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat alamat Posyandu...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            <AddressItem label="Nama Posyandu" value={address?.posyanduName} />
            <AddressItem label="RT" value={address?.rt} />
            <AddressItem label="RW" value={address?.rw} />
            <AddressItem label="Kelurahan" value={address?.villageName} />
            <AddressItem label="Kecamatan" value={address?.districtName} />
            <AddressItem label="Kota" value={address?.cityName} />
          </dl>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Kader</p>
        </div>
        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data kader...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2">
            <CadreItem label="Jumlah Kader" value={overview?.cadres.total ?? 0} />
            <CadreItem label="Jumlah Kader Hadir" value={overview?.cadres.present ?? 0} />
          </dl>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ibu Hamil dan Ibu Nifas</p>
        </div>
        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data ibu hamil dan ibu nifas...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            <CountItem label="Jumlah Ibu Hamil" value={overview?.pregnantAndPostpartum.totalPregnantWomen} />
            <CountItem label="Ibu Hamil Mendapat Tablet Tambah Besi (FE) III (90 Tablet)" value={overview?.pregnantAndPostpartum.pregnantWomenReceivedIron} />
            <CountItem label="Ibu Hamil Risiko KEK (LILA < 23,5 cm)" value={overview?.pregnantAndPostpartum.pregnantWomenAtRiskOfKek} />
            <CountItem label="Jumlah Ibu Nifas" value={overview?.pregnantAndPostpartum.totalPostpartumMothers} />
            <CountItem label="Ibu Nifas Mendapat Kapsul Vitamin A Merah" value={overview?.pregnantAndPostpartum.postpartumMothersReceivedRedVitaminA} />
          </dl>
        )}
      </section>

      <WeighingSection
        isLoading={isLoading}
        rows={[
          { label: "Semua Bayi/Balita (S)", value: weighing?.registeredChildren },
          { label: "Memiliki KMS (K)", value: weighing?.childrenWithKms },
          { label: "Ditimbang (D)", value: weighing?.weighedChildren },
          { label: "Berat Badan Naik (N)", value: weighing?.nutritionGuide.weightUp },
          { label: "Berat Badan Tidak Naik (T)", value: weighing?.nutritionGuide.weightNotUp },
          { label: "Tidak Menimbang Bulan Lalu (O)", value: weighing?.nutritionGuide.notWeighedLastMonth },
          { label: "Pertama Kali Menimbang (B)", value: weighing?.nutritionGuide.firstWeighing },
          { label: "Bawah Garis Merah (BGM)", value: weighing?.belowRedLine },
          { label: "BGM Dirujuk ke Puskesmas", value: weighing?.belowRedLineReferred },
          { label: "Atas Pita Hijau (APH)", value: weighing?.aboveGreenLine },
          { label: "APH Dirujuk ke Puskesmas", value: weighing?.aboveGreenLineReferred },
          { label: "Tidak Naik 2X Berturut-turut (2T)", value: weighing?.weightNotUpTwice },
          { label: "2T Dirujuk ke Puskesmas", value: weighing?.weightNotUpTwiceReferred },
        ]}
        title="Hasil Kegiatan Berdasarkan Umur"
      />

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-extrabold text-text-primary">Bayi dan Balita Mendapat Kapsul Vitamin A</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data Vitamin A...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2">
            <VitaminGenderItem label="Vitamin A Biru (Usia 6–11 Bulan)" value={overview?.vitaminA.blueCapsuleAge6To11Months} />
            <VitaminGenderItem label="Vitamin A Merah (Usia 12–59 Bulan)" value={overview?.vitaminA.redCapsuleAge12To59Months} />
          </dl>
        )}
      </section>

      <BreastfeedingSection
        isLoading={isLoading}
        rows={[
          { label: "Bayi Usia 0–5 Bulan 29 Hari yang Masih Diberi ASI Saja (ASI Proses)", value: breastfeeding?.breastMilkOnlyInProcess },
          { label: "Bayi Usia 0–5 Bulan 29 Hari yang Diberi Makanan/Minuman Selain ASI", value: breastfeeding?.receivedOtherFoodOrDrink },
          { label: "Bayi Usia 0–5 Bulan 29 Hari yang Ditimbang tetapi Tidak Terdata ASI", value: breastfeeding?.weighedWithoutBreastfeedingRegistration },
          { label: "Bayi yang Mencapai Usia 6 Bulan pada Bulan Ini", value: breastfeeding?.reachedSixMonthsThisMonth },
          { label: "Jumlah Bayi yang Mendapat ASI Eksklusif Selama 6 Bulan pada Bulan Ini (Lulus ASI Eksklusif)", value: breastfeeding?.completedExclusiveBreastfeeding },
        ]}
      />

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-extrabold text-text-primary">Keterangan</h2>
        </div>
        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary">Memuat keterangan...</p>
        ) : (
          <p className="whitespace-pre-wrap px-5 py-5 text-sm leading-6 text-text-primary">
            {overview?.savedReport?.keterangan?.trim() || "-"}
          </p>
        )}
      </section>
    </main>
    {isExportDialogOpen && overview && (
      <div aria-modal="true" className="fixed inset-0 z-100 grid place-items-center bg-text-primary/45 p-4" role="dialog">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-lg">
          <div className="px-6 py-5">
            <h2 className="text-lg font-extrabold text-text-primary">Pengesahan Kegiatan Penimbangan</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Pilih ketua Posyandu dan unggah foto tanda tangan untuk dimasukkan ke file Excel.</p>
            {error && <p className="mt-4 rounded-lg border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error">{error}</p>}
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-text-primary">Nama Ketua</label>
                <SearchableSelect ariaLabel="Pilih ketua Posyandu" onValueChange={(value) => setSelectedChairId(String(value))} options={overview.cadres.list.map((cadre) => ({ label: cadre.name, value: cadre.id }))} placeholder="Pilih kader" value={selectedChairId} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-text-primary" htmlFor="monthly-results-signature">Foto Tanda Tangan</label>
                <input accept="image/png,image/jpeg" className="block w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:font-semibold file:text-primary" id="monthly-results-signature" onChange={(event) => setSignatureFile(event.target.files?.[0] ?? null)} type="file" />
                <p className="mt-1.5 text-xs text-text-secondary">Format PNG atau JPG, maksimal 5 MB.</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4">
            <Button disabled={isExporting} onClick={() => setIsExportDialogOpen(false)} variant="outline">Batal</Button>
            <Button disabled={!selectedChairId || !signatureFile} isLoading={isExporting} onClick={() => void exportReport()}>Export Excel</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function AddressItem({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="bg-surface px-5 py-5"><dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-2 text-base font-extrabold text-text-primary">{value || "-"}</dd></div>;
}

function CadreItem({ label, value }: { label: string; value: number }) {
  return <div className="bg-surface px-5 py-5"><dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-2 text-2xl font-extrabold text-text-primary">{value}</dd></div>;
}

function CountItem({ label, value }: { label: string; value: number | null | undefined }) {
  return <div className="bg-surface px-5 py-5"><dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-2 text-2xl font-extrabold text-text-primary">{value ?? "-"}</dd></div>;
}

function VitaminGenderItem({ label, value }: {
  label: string;
  value: { female: number | null; male: number | null; total: number | null } | undefined;
}) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-4 grid grid-cols-3 gap-3 text-center">
        <GenderValue label="Laki-laki" value={value?.male} />
        <GenderValue label="Perempuan" value={value?.female} />
        <GenderValue emphasized label="Total" value={value?.total} />
      </dd>
    </div>
  );
}

function GenderValue({ emphasized = false, label, value }: { emphasized?: boolean; label: string; value: number | null | undefined }) {
  return <div className={`rounded-lg px-2 py-3 ${emphasized ? "bg-primary/10" : "bg-background"}`}><p className="text-xs font-semibold text-text-secondary">{label}</p><p className={`mt-1 text-xl font-extrabold ${emphasized ? "text-primary" : "text-text-primary"}`}>{value ?? "-"}</p></div>;
}

function WeighingSection({ isLoading, rows, title }: {
  isLoading: boolean;
  rows: Array<{ label: string; value: MonthlyResultsGroupedCount | undefined }>;
  title: string;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-extrabold text-text-primary">{title}</h2>
      </div>
      {isLoading ? (
        <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat hasil kegiatan...</p>
      ) : (
        <>
        <div className="space-y-3 p-4 md:hidden">
          {rows.map((row) => (
            <article className="overflow-hidden rounded-xl border border-border bg-surface" key={row.label}>
              <h3 className="border-b border-border bg-background px-4 py-3 text-sm font-bold text-text-primary">{row.label}</h3>
              <div className="grid grid-cols-2 gap-px bg-border">
                <MobileGenderCount label="0–5 bln" value={row.value?.age0To5Months} />
                <MobileGenderCount label="6–11 bln" value={row.value?.age6To11Months} />
                <MobileGenderCount label="12–23 bln" value={row.value?.age12To23Months} />
                <MobileGenderCount label="24–59 bln" value={row.value?.age24To59Months} />
                <MobileGenderCount emphasized label="Jumlah" value={row.value?.total} />
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-hidden md:block">
          <table className="w-full table-fixed text-center text-sm">
            <colgroup>
              <col className="w-[32%]" />
              {Array.from({ length: 10 }, (_, index) => <col className="w-[6.8%]" key={index} />)}
            </colgroup>
            <thead className="bg-background text-xs font-bold uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="border-r border-border px-4 py-3 text-left" rowSpan={2}>Uraian Kegiatan</th>
                <th className="px-3 py-3" colSpan={2}>0–5 bln</th>
                <th className="px-3 py-3" colSpan={2}>6–11 bln</th>
                <th className="px-3 py-3" colSpan={2}>12–23 bln</th>
                <th className="px-3 py-3" colSpan={2}>24–59 bln</th>
                <th className="px-3 py-3" colSpan={2}>Jumlah</th>
              </tr>
              <tr>{Array.from({ length: 5 }, (_, index) => <FragmentGenderHeaders key={index} />)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr className={index === 0 ? "border-t border-border" : ""} key={row.label}>
                  <th className="break-words border-r border-border px-4 py-3 text-left font-semibold text-text-primary" scope="row">{row.label}</th>
                  <GenderCells value={row.value?.age0To5Months} />
                  <GenderCells value={row.value?.age6To11Months} />
                  <GenderCells value={row.value?.age12To23Months} />
                  <GenderCells value={row.value?.age24To59Months} />
                  <GenderCells emphasized value={row.value?.total} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}

function FragmentGenderHeaders() {
  return <><th className="border-t border-border px-3 py-2">L</th><th className="border-t border-border px-3 py-2">P</th></>;
}

function GenderCells({ emphasized = false, value }: {
  emphasized?: boolean;
  value: { female: number; male: number } | undefined;
}) {
  const className = emphasized ? "px-3 py-3 font-extrabold text-primary" : "px-3 py-3 font-bold text-text-primary";
  return <><td className={className}>{value?.male ?? 0}</td><td className={className}>{value?.female ?? 0}</td></>;
}

function MobileGenderCount({ emphasized = false, label, value }: {
  emphasized?: boolean;
  label: string;
  value: { female: number; male: number } | undefined;
}) {
  return (
    <div className={`px-4 py-3 ${emphasized ? "col-span-2 bg-primary/10" : "bg-surface"}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${emphasized ? "text-primary" : "text-text-secondary"}`}>{label}</p>
      <div className="mt-2 space-y-1.5 text-sm font-extrabold text-text-primary">
        <p className="flex items-center justify-between gap-2"><span>Laki-laki</span><span className={emphasized ? "text-primary" : ""}>{value?.male ?? 0}</span></p>
        <p className="flex items-center justify-between gap-2"><span>Perempuan</span><span className={emphasized ? "text-primary" : ""}>{value?.female ?? 0}</span></p>
      </div>
    </div>
  );
}

function BreastfeedingSection({ isLoading, rows }: {
  isLoading: boolean;
  rows: Array<{
    label: string;
    value: { female: number | null; male: number | null; total: number | null } | undefined;
  }>;
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-extrabold text-text-primary">Bayi Mendapat ASI Eksklusif</h2>
      </div>
      {isLoading ? (
        <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data ASI eksklusif...</p>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {rows.map((row) => (
              <article className="rounded-xl border border-border bg-surface p-4" key={row.label}>
                <h3 className="text-sm font-bold leading-6 text-text-primary">{row.label}</h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <GenderValue label="Laki-laki" value={row.value?.male} />
                  <GenderValue label="Perempuan" value={row.value?.female} />
                  <GenderValue emphasized label="Total" value={row.value?.total} />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <table className="w-full table-fixed text-sm">
              <colgroup><col className="w-[70%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[10%]" /></colgroup>
              <thead className="bg-background text-xs font-bold uppercase tracking-wide text-text-secondary">
                <tr><th className="border-r border-border px-5 py-3 text-left">Uraian Kegiatan</th><th className="px-3 py-3 text-center">L</th><th className="px-3 py-3 text-center">P</th><th className="px-3 py-3 text-center">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-border border-t border-border">
                {rows.map((row) => (
                  <tr key={row.label}><th className="border-r border-border px-5 py-4 text-left font-semibold text-text-primary" scope="row">{row.label}</th><td className="px-3 py-4 text-center font-bold">{row.value?.male ?? "-"}</td><td className="px-3 py-4 text-center font-bold">{row.value?.female ?? "-"}</td><td className="px-3 py-4 text-center font-extrabold text-primary">{row.value?.total ?? "-"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function parseMonth(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 12 ? number : fallback;
}

function parseYear(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 2000 && number <= 2100 ? number : fallback;
}
