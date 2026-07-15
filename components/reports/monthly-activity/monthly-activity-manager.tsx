"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  MonthlyActivityGenderCount,
  MonthlyActivityOverview,
} from "@/components/reports/monthly-activity/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { useCurrentUser } from "@/components/user/user-provider";
import { getMonthlyActivityReport } from "@/lib/reports/monthly-activity/api";
import { exportMonthlyActivityReport } from "@/lib/reports/monthly-activity/export";
import { getUser } from "@/lib/user/api";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const pregnantActivityItems = [
  {
    description: "Total ibu hamil yang diperiksa pada periode ini.",
    field: "periksa_bumil",
    label: "Bumil Diperiksa",
  },
  {
    description: "Total ibu hamil yang mendapat tablet tambah darah.",
    field: "fe_tab_tablet_besi",
    label: "Tablet Besi",
  },
  {
    description: "Total ibu hamil yang mendapat imunisasi TT 1.",
    field: "imunisasi_tt_1",
    label: "Imunisasi Ibu Hamil 1",
  },
  {
    description: "Total ibu hamil yang mendapat imunisasi TT 2.",
    field: "imunisasi_tt_2",
    label: "Imunisasi Ibu Hamil 2",
  },
] as const;

const kbItems = [
  { field: "total_kb_kondom", label: "Kondom" },
  { field: "total_kb_pil", label: "Pil" },
  { field: "total_kb_implant", label: "Implant" },
  { field: "total_kb_mop", label: "MOP" },
  { field: "total_kb_mow", label: "MOW" },
  { field: "total_kb_iud", label: "IUD" },
  { field: "total_kb_suntik", label: "Suntik" },
  { field: "total_kb_lainnya", label: "Lainnya" },
] as const;

const immunizationItems = [
  { femaleField: "total_bcg_p", label: "BCG", maleField: "total_bcg_l" },
  { femaleField: "total_dpt_1_p", label: "DPT 1", maleField: "total_dpt_1_l" },
  { femaleField: "total_dpt_2_p", label: "DPT 2", maleField: "total_dpt_2_l" },
  { femaleField: "total_dpt_3_p", label: "DPT 3", maleField: "total_dpt_3_l" },
  { femaleField: "total_polio_1_p", label: "Polio 1", maleField: "total_polio_1_l" },
  { femaleField: "total_polio_2_p", label: "Polio 2", maleField: "total_polio_2_l" },
  { femaleField: "total_polio_3_p", label: "Polio 3", maleField: "total_polio_3_l" },
  { femaleField: "total_polio_4_p", label: "Polio 4", maleField: "total_polio_4_l" },
  { femaleField: "total_hepatitis_b_1_p", label: "Hepatitis B 1", maleField: "total_hepatitis_b_1_l" },
  { femaleField: "total_hepatitis_b_2_p", label: "Hepatitis B 2", maleField: "total_hepatitis_b_2_l" },
  { femaleField: "total_hepatitis_b_3_p", label: "Hepatitis B 3", maleField: "total_hepatitis_b_3_l" },
  { femaleField: "total_campak_p", label: "Campak", maleField: "total_campak_l" },
] as const;

const diarrheaItems = [
  { femaleField: "total_balita_diare_p", label: "Balita Diare", maleField: "total_balita_diare_l" },
  { femaleField: "total_oralit_p", label: "Mendapat Oralit", maleField: "total_oralit_l" },
] as const;

export function MonthlyActivityManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => parseMonth(searchParams.get("month"), today.getMonth() + 1));
  const [year, setYear] = useState(() => parseYear(searchParams.get("year"), today.getFullYear()));
  const [report, setReport] = useState<MonthlyActivityOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = monthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });
  const weighingSummary = report?.weighingSummary ?? null;

  useEffect(() => {
    let isActive = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getMonthlyActivityReport(month, year);
        if (isActive) setReport(result);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Laporan kegiatan gagal dimuat.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, [month, year]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    router.replace(`/reports/monthly-activity?${new URLSearchParams({ month: String(nextMonth), year: String(nextYear) })}`);
  }

  async function exportReport() {
    if (!report) return;
    setIsExporting(true);
    setError(null);
    try {
      exportMonthlyActivityReport(report, await getUser());
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Laporan kegiatan gagal diekspor.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Kegiatan Bulanan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Rekap kegiatan layanan Posyandu bulan ini.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_8rem]">
            <SearchableSelect ariaLabel="Pilih bulan" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
            <SearchableSelect ariaLabel="Pilih tahun" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
          </div>
          <Button disabled={!report || isExporting} onClick={() => void exportReport()} variant="outline">{isExporting ? "Mengekspor..." : "Export"}</Button>
          {canManage && <Button disabled={isLoading} onClick={() => router.push(`/reports/monthly-activity/create?period=${year}-${String(month).padStart(2, "0")}`)}>{report?.savedReport ? "Edit" : "Tambah"}</Button>}
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Data ibu hamil</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">{monthNames[month - 1]} {year}</h2>
          <p className="mt-1 text-sm text-text-secondary">Total ibu hamil diambil dari laporan kehadiran bulanan pada periode yang sama.</p>
          {!isLoading && report?.savedReport && (
            <p className="mt-2 text-xs font-semibold text-text-secondary">
              Dibuat oleh: <span className="text-text-primary">{report.savedReport.created_by_name ?? report.savedReport.created_by ?? "-"}</span>
            </p>
          )}
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat laporan kegiatan...</p>
        ) : (
          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard
                description="Berdasarkan laporan kehadiran bulan ini."
                label="Total ibu hamil"
                value={report?.totalPregnantWomen ?? 0}
              />
              <SummaryCard
                description="Berdasarkan laporan kehadiran bulan ini."
                label="Total ibu menyusui"
                value={report?.totalBreastfeedingMothers ?? 0}
              />
            </div>

            {!report?.savedReport && (
              <p className="mt-4 rounded-xl bg-background px-4 py-3 text-sm font-medium text-text-secondary">
                Laporan kegiatan untuk periode ini belum tersedia. Status kegiatan akan tampil setelah laporan kegiatan dibuat.
              </p>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {pregnantActivityItems.map((item) => (
                <PregnantActivityCard
                  description={item.description}
                  isEnabled={report?.savedReport?.[item.field] ?? null}
                  key={item.field}
                  label={item.label}
                  totalPregnantWomen={report?.totalPregnantWomen ?? 0}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Data KB</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Aseptor KB</h2>
          <p className="mt-1 text-sm text-text-secondary">Jumlah seluruh peserta KB berdasarkan jenis alat atau metode KB pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data KB...</p>
        ) : (
          <div className="p-5">
            <SummaryCard
              description="Akumulasi kondom, pil, implant, MOP, MOW, IUD, suntik, dan KB lainnya."
              label="JML. ASEPTOR KB"
              value={report?.savedReport ? getTotalKbAcceptors(report.savedReport) : "-"}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kbItems.map((item) => (
                <SmallInfoCard
                  key={item.field}
                  label={item.label}
                  value={report?.savedReport ? report.savedReport[item.field] : null}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Penimbangan Balita</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Ringkasan Penimbangan</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Jumlah balita aktif, kepemilikan KMS(K), penimbangan, dan layanan pendukung pada periode yang dipilih.
          </p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data penimbangan...</p>
        ) : (
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            <GenderCountCard
              description="Balita aktif sesuai periode list balita, maksimal usia 60 bulan."
              label="Balita Aktif"
              value={weighingSummary?.activeChildren ?? emptyGenderCount}
            />
            <GenderCountCard
              description="Mengikuti status KMS(K) pada laporan kegiatan."
              label="Memiliki KMS(K)"
              value={weighingSummary?.kmsK ?? null}
            />
            <GenderCountCard
              description="Balita yang memiliki data berat badan pada bulan ini."
              label="Melakukan Penimbangan"
              value={weighingSummary?.weighedChildren ?? emptyGenderCount}
            />
            <GenderCountCard
              description="Balita dengan berat badan naik dibanding catatan sebelumnya."
              label="Berat Badan Naik"
              value={weighingSummary?.weightUp ?? emptyGenderCount}
            />
            <GenderCountCard
              description="Mengikuti status pemberian vitamin A pada laporan kegiatan."
              label="Mendapat Vitamin A"
              value={weighingSummary?.vitaminA ?? null}
            />
            <GenderCountCard
              description="Mengikuti status pemberian PMT pada laporan kegiatan."
              label="Mendapat PMT"
              value={weighingSummary?.pmt ?? null}
            />
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Jumlah Bayi yang Diimunisasi</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Data Imunisasi Bayi</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Rekap jumlah bayi yang mendapat imunisasi berdasarkan jenis imunisasi dan jenis kelamin.
          </p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data imunisasi...</p>
        ) : (
          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {immunizationItems.map((item) => (
              <ImmunizationCountCard
                key={item.label}
                label={item.label}
                report={report?.savedReport ?? null}
                femaleField={item.femaleField}
                maleField={item.maleField}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Balita yang Menderita Diare</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Data Diare dan Oralit</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Rekap jumlah balita yang mengalami diare dan mendapat oralit berdasarkan jenis kelamin.
          </p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data diare...</p>
        ) : (
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {diarrheaItems.map((item) => (
              <DiarrheaCountCard
                key={item.label}
                label={item.label}
                report={report?.savedReport ?? null}
                femaleField={item.femaleField}
                maleField={item.maleField}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Keterangan</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Catatan Laporan</h2>
          <p className="mt-1 text-sm text-text-secondary">Catatan tambahan dari laporan kegiatan Posyandu pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary">Memuat keterangan...</p>
        ) : (
          <div className="p-5">
            <p className="min-h-24 rounded-xl bg-background px-4 py-3 text-sm leading-6 text-text-secondary whitespace-pre-line">
              {report?.savedReport?.keterangan?.trim() || "-"}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

const emptyGenderCount: MonthlyActivityGenderCount = { female: 0, male: 0, total: 0 };

function SummaryCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-primary/10 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{label}</p>
      <p className="mt-2 text-4xl font-extrabold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function getTotalKbAcceptors(report: NonNullable<MonthlyActivityOverview["savedReport"]>) {
  return kbItems.reduce((total, item) => total + (report[item.field] ?? 0), 0);
}

function SmallInfoCard({ label, value }: { label: string; value: number | null }) {
  return (
    <article className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-text-primary">{value ?? "-"}</p>
    </article>
  );
}

function GenderCountCard({
  description,
  label,
  value,
}: {
  description: string;
  label: string;
  value: MonthlyActivityGenderCount | null;
}) {
  return (
    <article className="rounded-xl bg-background p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <GenderCountItem label="L" value={value?.male ?? null} />
        <GenderCountItem label="P" value={value?.female ?? null} />
        <GenderCountItem label="Total" value={value?.total ?? null} />
      </div>
    </article>
  );
}

function GenderCountItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-text-primary">{value ?? "-"}</p>
    </div>
  );
}

function ImmunizationCountCard({
  femaleField,
  label,
  maleField,
  report,
}: {
  femaleField: (typeof immunizationItems)[number]["femaleField"];
  label: string;
  maleField: (typeof immunizationItems)[number]["maleField"];
  report: MonthlyActivityOverview["savedReport"];
}) {
  const male = report?.[maleField] ?? null;
  const female = report?.[femaleField] ?? null;
  const total = male === null && female === null ? null : (male ?? 0) + (female ?? 0);

  return (
    <article className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <GenderCountItem label="L" value={male} />
        <GenderCountItem label="P" value={female} />
        <GenderCountItem label="Total" value={total} />
      </div>
    </article>
  );
}

function DiarrheaCountCard({
  femaleField,
  label,
  maleField,
  report,
}: {
  femaleField: (typeof diarrheaItems)[number]["femaleField"];
  label: string;
  maleField: (typeof diarrheaItems)[number]["maleField"];
  report: MonthlyActivityOverview["savedReport"];
}) {
  const male = report?.[maleField] ?? null;
  const female = report?.[femaleField] ?? null;
  const total = male === null && female === null ? null : (male ?? 0) + (female ?? 0);

  return (
    <article className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <GenderCountItem label="L" value={male} />
        <GenderCountItem label="P" value={female} />
        <GenderCountItem label="Total" value={total} />
      </div>
    </article>
  );
}

function PregnantActivityCard({
  description,
  isEnabled,
  label,
  totalPregnantWomen,
}: {
  description: string;
  isEnabled: boolean | null;
  label: string;
  totalPregnantWomen: number;
}) {
  const value = isEnabled === true ? String(totalPregnantWomen) : isEnabled === false ? "0" : "-";
  const status = isEnabled === true ? "Dilakukan" : isEnabled === false ? "Tidak dilakukan" : "Belum diisi";
  return (
    <article className="rounded-xl bg-background p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-3 text-3xl font-extrabold text-text-primary">{value}</p>
      <p className={`mt-1 text-xs font-bold ${isEnabled === true ? "text-primary" : isEnabled === false ? "text-error" : "text-text-secondary"}`}>{status}</p>
      <p className="mt-3 text-xs leading-5 text-text-secondary">{description}</p>
    </article>
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
