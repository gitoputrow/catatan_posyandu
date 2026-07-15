"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { GebyarReport } from "@/components/reports/gebyar/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Form, FormField } from "@/components/ui/form";
import { getGebyarReport, saveGebyarReport } from "@/lib/reports/gebyar/api";

const programFields = [
  ["program_tambahan_total_ppks", "Jumlah PPKS"],
  ["program_tambahan_total_bkb", "Jumlah BKB"],
  ["program_tambahan_total_paud", "Jumlah PAUD"],
  ["program_tambahan_total_gsi", "Gerakan Sayang Ibu (GSI)"],
  ["program_tambahan_total_psn", "Pemberantasan Sarang Nyamuk (PSN)"],
  ["program_tambahan_total_lainnya", "Program Lain-lain"],
] as const;

const partnerFields = [
  ["mitra_total_perusahaan", "Jumlah Perusahaan"],
  ["mitra_total_bumn_bumd", "Jumlah BUMN / BUMD"],
  ["mitra_total_kantor_dinas", "Jumlah Kantor / Dinas"],
  ["mitra_total_lsm_lsom", "Jumlah LSM / LSOM"],
] as const;

const healthyFundFields = [
  ["dana_sehat_total_keluarga_sasaran", "Jumlah Keluarga Sasaran"],
  ["dana_sehat_total_sumbangan", "Jumlah Keluarga Menyumbang"],
] as const;

const numberFields = [...programFields, ...partnerFields, ...healthyFundFields] as const;
type NumberField = typeof numberFields[number][0];
type SupplementaryFoodValue = "true" | "false" | "null";

export function GebyarReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [period, setPeriod] = useState(() => normalizeInitialPeriod(searchParams.get("period"), today));
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(createEmptyNumbers());
  const [supplementaryFood, setSupplementaryFood] = useState<SupplementaryFoodValue>("null");
  const [overview, setOverview] = useState<GebyarReport | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const [year, month] = period.split("-").map(Number);
    void getGebyarReport(month, year)
      .then((report) => {
        if (!active) return;
        setOverview(report);
        setIsEditMode(Boolean(report.savedReport));
        if (report.savedReport) {
          setNumbers(Object.fromEntries(numberFields.map(([name]) => [name, String(report.savedReport?.[name] ?? 0)])) as Record<NumberField, string>);
          setSupplementaryFood(toFormBoolean(report.savedReport.pemberian_tambahan_makanan));
        } else {
          setNumbers(createEmptyNumbers());
          setSupplementaryFood("null");
        }
      })
      .catch((loadError) => {
        if (active) {
          setOverview(null);
          setError(loadError instanceof Error ? loadError.message : "Laporan Gebyar gagal dimuat.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [period]);

  function changePeriod(value: string) {
    setIsLoading(true);
    setError(null);
    setOverview(null);
    setPeriod(value);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmOpen(true);
  }

  async function persistReport() {
    setIsSaving(true);
    setError(null);
    try {
      await saveGebyarReport({
        periode: period,
        pemberian_tambahan_makanan: fromFormBoolean(supplementaryFood),
        ...Object.fromEntries(numberFields.map(([name]) => [name, toNonNegativeInteger(numbers[name])])) as Record<NumberField, number>,
      });
      const [year, month] = period.split("-");
      setIsConfirmOpen(false);
      router.push(`/reports/gebyar?month=${Number(month)}&year=${year}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Laporan Gebyar gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div className="border-b border-border p-6">
        <FormField className="max-w-sm" label="Periode laporan" name="periode" onChange={(event) => changePeriod(event.target.value)} required type="month" value={period} />
      </div>

      <section className="border-b border-border p-6">
        <h2 className="font-extrabold text-text-primary">Ringkasan Gebyar Bulanan</h2>
        <p className="mt-1 text-sm text-text-secondary">Referensi singkat dari laporan kehadiran, kegiatan, dan pertumbuhan pada periode ini.</p>
        {isLoading ? (
          <p className="mt-4 rounded-xl bg-background px-4 py-6 text-center text-sm text-text-secondary">Memuat ringkasan...</p>
        ) : overview ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Posyandu" value={overview.identity.posyanduName} />
            <SummaryItem label="Kader Hadir" value={`${overview.identity.presentCadres} / ${overview.identity.totalCadres}`} />
            <SummaryItem label="Bumil / Diperiksa" value={`${overview.healthOfMotherAndChild.totalPregnantWomen} / ${overview.healthOfMotherAndChild.pregnantWomenExamined ?? "-"}`} />
            <SummaryItem label="PUS / Peserta KB" value={`${overview.familyPlanning.coachedCouplesOfReproductiveAge} / ${overview.familyPlanning.servedParticipants?.total ?? "-"}`} />
            <SummaryItem label="Balita / Ditimbang" value={`${overview.nutrition.totalChildren} / ${overview.nutrition.weighedChildren}`} />
            <SummaryItem label="BB Naik / Tidak" value={`${overview.nutrition.weightUp} / ${overview.nutrition.weightNotUp}`} />
            <SummaryItem label="Total Imunisasi" value={getImmunizationTotal(overview)} />
            <SummaryItem label="Diare / Oralit" value={`${overview.diarrheaPrevention.childrenSuspectedDiarrhea ?? "-"} / ${overview.diarrheaPrevention.childrenGivenOralit ?? "-"}`} />
          </div>
        ) : null}
      </section>

      <FormSection description="Pilih status pemberian makanan tambahan pada periode laporan." title="Pemberian Makanan Tambahan">
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-text-primary">Status pemberian</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <RadioOption checked={supplementaryFood === "true"} label="Ada" onChange={() => setSupplementaryFood("true")} />
            <RadioOption checked={supplementaryFood === "false"} label="Tidak Ada" onChange={() => setSupplementaryFood("false")} />
            <RadioOption checked={supplementaryFood === "null"} label="Belum Diisi" onChange={() => setSupplementaryFood("null")} />
          </div>
        </fieldset>
      </FormSection>

      <NumberSection description="Isi jumlah masing-masing program tambahan." fields={programFields} numbers={numbers} onChange={(name, value) => setNumbers((current) => ({ ...current, [name]: value }))} title="Program Tambahan" />
      <NumberSection description="Isi jumlah mitra Posyandu yang terlibat." fields={partnerFields} numbers={numbers} onChange={(name, value) => setNumbers((current) => ({ ...current, [name]: value }))} title="Mitra Posyandu" />
      <NumberSection description="Isi jumlah keluarga sasaran dan keluarga yang menyumbang." fields={healthyFundFields} numbers={numbers} onChange={(name, value) => setNumbers((current) => ({ ...current, [name]: value }))} title="Dana Sehat" />

      {error && <p className="px-6 pb-4 text-sm font-medium text-error">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
        <Button onClick={() => router.push("/reports/gebyar")} type="button" variant="outline">Batal</Button>
        <Button disabled={isLoading || isSaving} type="submit">{isEditMode ? "Simpan Perubahan" : "Tambah Laporan"}</Button>
      </div>
      <ConfirmationDialog confirmLabel={isEditMode ? "Ya, Simpan" : "Ya, Tambah"} description={<>Pastikan data Gebyar periode <strong className="text-text-primary">{formatPeriodLabel(period)}</strong> sudah benar.</>} isLoading={isSaving} isOpen={isConfirmOpen} onCancel={() => setIsConfirmOpen(false)} onConfirm={() => void persistReport()} title={isEditMode ? "Simpan perubahan laporan Gebyar?" : "Tambah laporan Gebyar baru?"} />
    </Form>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-xl bg-background px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-1 font-extrabold text-text-primary">{value}</p></div>;
}

function getImmunizationTotal(report: GebyarReport) {
  const values = Object.values(report.immunization).filter((value): value is number => typeof value === "number");
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) : "-";
}

function NumberSection({ description, fields, numbers, onChange, title }: { description: string; fields: ReadonlyArray<readonly [NumberField, string]>; numbers: Record<NumberField, string>; onChange: (name: string, value: string) => void; title: string }) {
  return <FormSection description={description} title={title}>{fields.map(([name, label]) => <FormField key={name} label={label} min="0" name={name} onValueChange={onChange} required step="1" type="number" value={numbers[name]} />)}</FormSection>;
}

function FormSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return <section className="border-t border-border p-6"><h2 className="font-extrabold text-text-primary">{title}</h2><p className="mt-1 text-sm text-text-secondary">{description}</p><div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div></section>;
}

function RadioOption({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition ${checked ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-primary/5"}`}><input checked={checked} className="sr-only" name="pemberian_tambahan_makanan" onChange={onChange} type="radio" />{label}</label>;
}

function createEmptyNumbers() {
  return Object.fromEntries(numberFields.map(([name]) => [name, "0"])) as Record<NumberField, string>;
}

function toNonNegativeInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function toFormBoolean(value: boolean | null): SupplementaryFoodValue {
  return value === true ? "true" : value === false ? "false" : "null";
}

function fromFormBoolean(value: SupplementaryFoodValue) {
  return value === "true" ? true : value === "false" ? false : null;
}

function normalizeInitialPeriod(value: string | null, fallback: Date) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1));
}
