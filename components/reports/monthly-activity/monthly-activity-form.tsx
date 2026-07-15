"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { MonthlyActivityOverview } from "@/components/reports/monthly-activity/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Form, FormField, FormTextarea } from "@/components/ui/form";
import {
  getMonthlyActivityReport,
  saveMonthlyActivityReport,
} from "@/lib/reports/monthly-activity/api";

const kbFields = [
  ["total_kb_kondom", "KB Kondom"],
  ["total_kb_pil", "KB Pil"],
  ["total_kb_implant", "KB Implant"],
  ["total_kb_mop", "KB MOP"],
  ["total_kb_mow", "KB MOW"],
  ["total_kb_iud", "KB IUD"],
  ["total_kb_suntik", "KB Suntik"],
  ["total_kb_lainnya", "KB Lainnya"],
] as const;

const immunizationFields = [
  ["total_bcg_l", "BCG Laki-laki"],
  ["total_bcg_p", "BCG Perempuan"],
  ["total_dpt_1_l", "DPT 1 Laki-laki"],
  ["total_dpt_1_p", "DPT 1 Perempuan"],
  ["total_dpt_2_l", "DPT 2 Laki-laki"],
  ["total_dpt_2_p", "DPT 2 Perempuan"],
  ["total_dpt_3_l", "DPT 3 Laki-laki"],
  ["total_dpt_3_p", "DPT 3 Perempuan"],
  ["total_polio_1_l", "Polio 1 Laki-laki"],
  ["total_polio_1_p", "Polio 1 Perempuan"],
  ["total_polio_2_l", "Polio 2 Laki-laki"],
  ["total_polio_2_p", "Polio 2 Perempuan"],
  ["total_polio_3_l", "Polio 3 Laki-laki"],
  ["total_polio_3_p", "Polio 3 Perempuan"],
  ["total_polio_4_l", "Polio 4 Laki-laki"],
  ["total_polio_4_p", "Polio 4 Perempuan"],
  ["total_hepatitis_b_1_l", "Hepatitis B 1 Laki-laki"],
  ["total_hepatitis_b_1_p", "Hepatitis B 1 Perempuan"],
  ["total_hepatitis_b_2_l", "Hepatitis B 2 Laki-laki"],
  ["total_hepatitis_b_2_p", "Hepatitis B 2 Perempuan"],
  ["total_hepatitis_b_3_l", "Hepatitis B 3 Laki-laki"],
  ["total_hepatitis_b_3_p", "Hepatitis B 3 Perempuan"],
  ["total_campak_l", "Campak Laki-laki"],
  ["total_campak_p", "Campak Perempuan"],
] as const;

const diarrheaFields = [
  ["total_balita_diare_l", "Balita Diare Laki-laki"],
  ["total_balita_diare_p", "Balita Diare Perempuan"],
  ["total_oralit_l", "Mendapat Oralit Laki-laki"],
  ["total_oralit_p", "Mendapat Oralit Perempuan"],
] as const;

const booleanFields = [
  ["periksa_bumil", "Pemeriksaan Ibu Hamil"],
  ["fe_tab_tablet_besi", "Tablet Tambah Darah"],
  ["imunisasi_tt_1", "Imunisasi TT 1"],
  ["imunisasi_tt_2", "Imunisasi TT 2"],
  ["balita_kmsk", "Balita Memiliki KMS(K)"],
  ["dapat_vit_a", "Pemberian Vitamin A"],
  ["dapat_pmt", "Pemberian PMT"],
] as const;

const numberFields = [...kbFields, ...immunizationFields, ...diarrheaFields] as const;

type NumberField = typeof numberFields[number][0];
type BooleanField = typeof booleanFields[number][0];
type BooleanValue = "true" | "false";

export function MonthlyActivityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [period, setPeriod] = useState(() => normalizeInitialPeriod(searchParams.get("period"), today));
  const [activity, setActivity] = useState<MonthlyActivityOverview | null>(null);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(createEmptyNumbers());
  const [booleans, setBooleans] = useState<Record<BooleanField, BooleanValue>>(createEmptyBooleans());
  const [keterangan, setKeterangan] = useState("");
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const [year, month] = period.split("-").map(Number);
    if (!year || !month) return;

    void getMonthlyActivityReport(month, year)
      .then((data) => {
        if (!active) return;
        setActivity(data);
        if (data.savedReport) {
          setNumbers(Object.fromEntries(numberFields.map(([name]) => [name, String(data.savedReport?.[name] ?? 0)])) as Record<NumberField, string>);
          setBooleans(Object.fromEntries(booleanFields.map(([name]) => [name, fromNullableBoolean(data.savedReport?.[name] ?? null)])) as Record<BooleanField, BooleanValue>);
          setKeterangan(data.savedReport.keterangan ?? "");
        } else {
          setNumbers(createEmptyNumbers());
          setBooleans(createEmptyBooleans());
          setKeterangan("");
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Informasi laporan kegiatan gagal dimuat.");
      })
      .finally(() => {
        if (active) setIsLoadingInfo(false);
      });

    return () => { active = false; };
  }, [period]);

  function changePeriod(value: string) {
    setIsLoadingInfo(true);
    setError(null);
    setActivity(null);
    setPeriod(value);
  }

  function updateNumber(name: string, value: string) {
    setNumbers((current) => ({ ...current, [name]: value }));
  }

  function updateBoolean(name: BooleanField, value: string) {
    setBooleans((current) => ({ ...current, [name]: value as BooleanValue }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmOpen(true);
  }

  async function persistReport() {
    setIsSaving(true);
    setError(null);
    try {
      await saveMonthlyActivityReport({
        periode: period,
        keterangan: keterangan.trim() || null,
        ...Object.fromEntries(numberFields.map(([name]) => [name, toNonNegativeInteger(numbers[name])])) as Record<NumberField, number>,
        ...Object.fromEntries(booleanFields.map(([name]) => [name, toNullableBoolean(booleans[name])])) as Record<BooleanField, boolean | null>,
      });
      const [year, month] = period.split("-");
      setIsConfirmOpen(false);
      router.push(`/reports/monthly-activity?month=${Number(month)}&year=${year}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Laporan kegiatan gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  const isEditMode = Boolean(activity?.savedReport);

  return (
    <Form onSubmit={handleSubmit}>
      <div className="border-b border-border p-6">
        <FormField className="max-w-sm" label="Periode laporan" name="periode" onChange={(event) => changePeriod(event.target.value)} required type="month" value={period} />
        <p className="mt-2 text-xs text-text-secondary">Pilih periode terlebih dahulu agar data pendukung laporan kegiatan dapat dimuat.</p>
      </div>

      <div className="border-b border-border p-6">
        <h2 className="font-extrabold text-text-primary">Informasi Otomatis</h2>
        <p className="mt-1 text-sm text-text-secondary">Data ini dihitung dari laporan kehadiran dan catatan penimbangan pada periode yang dipilih.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyCount isLoading={isLoadingInfo} label="Ibu Hamil" value={activity?.totalPregnantWomen ?? 0} />
          <ReadOnlyCount isLoading={isLoadingInfo} label="Ibu Menyusui" value={activity?.totalBreastfeedingMothers ?? 0} />
          <ReadOnlyCount isLoading={isLoadingInfo} label="Balita Aktif" value={activity?.weighingSummary.activeChildren.total ?? 0} />
          <ReadOnlyCount isLoading={isLoadingInfo} label="Ditimbang" value={activity?.weighingSummary.weighedChildren.total ?? 0} />
        </div>
      </div>

      <FormSection description="Isi jumlah aseptor KB berdasarkan jenis alat atau metode." title="Data KB">
        {kbFields.map(([name, label]) => <FormField key={name} label={label} min="0" name={name} onValueChange={updateNumber} required step="1" type="number" value={numbers[name]} />)}
      </FormSection>

      <FormSection description="Pilih Ada jika kegiatan dilakukan pada periode laporan." title="Status Kegiatan">
        {booleanFields.map(([name, label]) => (
          <BooleanRadioGroup key={name} label={label} name={name} onChange={updateBoolean} value={booleans[name]} />
        ))}
      </FormSection>

      <FormSection description="Isi jumlah bayi yang diimunisasi berdasarkan jenis kelamin." title="Jumlah Bayi yang Diimunisasi">
        {immunizationFields.map(([name, label]) => <FormField key={name} label={label} min="0" name={name} onValueChange={updateNumber} required step="1" type="number" value={numbers[name]} />)}
      </FormSection>

      <FormSection description="Isi jumlah balita diare dan balita yang mendapat oralit." title="Balita yang Menderita Diare">
        {diarrheaFields.map(([name, label]) => <FormField key={name} label={label} min="0" name={name} onValueChange={updateNumber} required step="1" type="number" value={numbers[name]} />)}
      </FormSection>

      <div className="p-6">
        <FormTextarea label="Keterangan" name="keterangan" onChange={(event) => setKeterangan(event.target.value)} placeholder="Tambahkan catatan laporan kegiatan bila ada" value={keterangan} />
      </div>

      {error && <p className="px-6 pb-4 text-sm font-medium text-error">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
        <Button onClick={() => router.push("/reports/monthly-activity")} type="button" variant="outline">Batal</Button>
        <Button disabled={isLoadingInfo || isSaving} type="submit">{isEditMode ? "Simpan Perubahan" : "Tambah Laporan"}</Button>
      </div>
      <ConfirmationDialog
        confirmLabel={isEditMode ? "Ya, Simpan" : "Ya, Tambah"}
        description={<>Pastikan data laporan kegiatan periode <strong className="text-text-primary">{formatPeriodLabel(period)}</strong> sudah benar.</>}
        isLoading={isSaving}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void persistReport()}
        title={isEditMode ? "Simpan perubahan laporan kegiatan?" : "Tambah laporan kegiatan baru?"}
      />
    </Form>
  );
}

function FormSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="border-t border-border p-6">
      <h2 className="font-extrabold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadOnlyCount({ isLoading, label, value }: { isLoading: boolean; label: string; value: number }) {
  return <div className="rounded-xl bg-primary/5 p-4"><p className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-2 text-2xl font-extrabold text-primary">{isLoading ? "…" : value}</p></div>;
}

function BooleanRadioGroup({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: BooleanField;
  onChange: (name: BooleanField, value: BooleanValue) => void;
  value: BooleanValue;
}) {
  return (
    <fieldset className="block">
      <legend className="text-sm font-semibold text-text-primary">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <RadioOption checked={value === "true"} label="Ada" name={name} onChange={() => onChange(name, "true")} value="true" />
        <RadioOption checked={value === "false"} label="Tidak" name={name} onChange={() => onChange(name, "false")} value="false" />
      </div>
    </fieldset>
  );
}

function RadioOption({
  checked,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: () => void;
  value: BooleanValue;
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition ${checked ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-primary/5"}`}>
      <input checked={checked} className="sr-only" name={name} onChange={onChange} type="radio" value={value} />
      {label}
    </label>
  );
}

function toNonNegativeInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function toNullableBoolean(value: BooleanValue) {
  if (value === "true") return true;
  return false;
}

function fromNullableBoolean(value: boolean | null): BooleanValue {
  if (value === true) return "true";
  return "false";
}

function formatMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function createEmptyNumbers() {
  return Object.fromEntries(numberFields.map(([name]) => [name, "0"])) as Record<NumberField, string>;
}

function createEmptyBooleans() {
  return Object.fromEntries(booleanFields.map(([name]) => [name, "false"])) as Record<BooleanField, BooleanValue>;
}

function normalizeInitialPeriod(value: string | null, fallback: Date) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : formatMonth(fallback);
}

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1));
}
