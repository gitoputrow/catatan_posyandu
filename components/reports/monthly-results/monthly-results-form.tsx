"use client";

import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { MonthlyResultsOverview, MonthlyResultsReportInput } from "@/components/reports/monthly-results/types";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Form, FormField, FormTextarea } from "@/components/ui/form";
import { getMonthlyResultsReport, saveMonthlyResultsReport } from "@/lib/reports/monthly-results/api";

const numberFields = [
  ["total_ibu_hamil_resiko_kek", "Ibu Hamil Risiko KEK"],
  ["total_ibu_nifas", "Jumlah Ibu Nifas"],
  ["total_balita_diberi_asi_proses_l", "ASI Saja (Proses) — Laki-laki"],
  ["total_balita_diberi_asi_proses_p", "ASI Saja (Proses) — Perempuan"],
  ["total_balita_diberi_makan_minum_l", "Makanan/Minuman Selain ASI — Laki-laki"],
  ["total_balita_diberi_makan_minum_p", "Makanan/Minuman Selain ASI — Perempuan"],
  ["total_balita_timbang_tidak_terdaftar_asi_l", "Ditimbang, Tidak Terdata ASI — Laki-laki"],
  ["total_balita_timbang_tidak_terdaftar_asi_p", "Ditimbang, Tidak Terdata ASI — Perempuan"],
  ["total_balita_asi_dapat_eksklusif_l", "Lulus ASI Eksklusif — Laki-laki"],
  ["total_balita_asi_dapat_eksklusif_p", "Lulus ASI Eksklusif — Perempuan"],
] as const;

type NumberField = typeof numberFields[number][0];
type BooleanValue = "true" | "false";

export function MonthlyResultsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(() => normalizeInitialPeriod(searchParams.get("period")));
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(createEmptyNumbers());
  const [redVitaminA, setRedVitaminA] = useState<BooleanValue>("false");
  const [keterangan, setKeterangan] = useState("");
  const [overview, setOverview] = useState<MonthlyResultsOverview | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const [year, month] = period.split("-").map(Number);
    if (!year || !month) return;

    void getMonthlyResultsReport(month, year)
      .then((overview) => {
        if (!active) return;
        setOverview(overview);
        const report = overview.savedReport;
        setIsEditMode(Boolean(report));
        if (!report) {
          setNumbers(createEmptyNumbers());
          setRedVitaminA("false");
          setKeterangan("");
          return;
        }
        setNumbers(Object.fromEntries(numberFields.map(([name]) => [name, String(report[name] ?? 0)])) as Record<NumberField, string>);
        setRedVitaminA(report.dapat_vit_a_merah ? "true" : "false");
        setKeterangan(report.keterangan ?? "");
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Data kegiatan penimbangan gagal dimuat.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [period]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmOpen(true);
  }

  function changePeriod(value: string) {
    setIsLoading(true);
    setError(null);
    setOverview(null);
    setPeriod(value);
  }

  async function persistReport() {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        periode: period,
        dapat_vit_a_merah: redVitaminA === "true",
        keterangan: keterangan.trim() || null,
        ...Object.fromEntries(numberFields.map(([name]) => [name, toNonNegativeInteger(numbers[name])])),
      } as MonthlyResultsReportInput;
      await saveMonthlyResultsReport(payload);
      const [year, month] = period.split("-");
      setIsConfirmOpen(false);
      router.push(`/reports/monthly-results?month=${Number(month)}&year=${year}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Kegiatan penimbangan gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div className="border-b border-border p-6">
        <FormField className="max-w-sm" label="Periode laporan" name="periode" onChange={(event) => changePeriod(event.target.value)} required type="month" value={period} />
        <p className="mt-2 text-xs text-text-secondary">
          {isLoading ? "Memeriksa data periode…" : isEditMode ? "Laporan periode ini sudah ada dan akan diperbarui." : "Belum ada laporan pada periode ini. Data baru akan ditambahkan."}
        </p>
      </div>

      <AutomaticSummary isLoading={isLoading} overview={overview} />

      <FormSection description="Data manual untuk melengkapi bagian ibu hamil dan ibu nifas." title="Ibu Hamil dan Ibu Nifas">
        {numberFields.slice(0, 2).map(([name, label]) => <NumberInput key={name} label={label} name={name} onChange={setNumbers} value={numbers[name]} />)}
        <BooleanRadioGroup onChange={setRedVitaminA} value={redVitaminA} />
      </FormSection>

      <FormSection description="Isi jumlah bayi laki-laki dan perempuan sesuai hasil kegiatan bulan terpilih." title="Data ASI Eksklusif">
        {numberFields.slice(2).map(([name, label]) => <NumberInput key={name} label={label} name={name} onChange={setNumbers} value={numbers[name]} />)}
      </FormSection>

      <div className="border-t border-border p-6">
        <FormTextarea label="Keterangan" name="keterangan" onChange={(event) => setKeterangan(event.target.value)} placeholder="Tambahkan keterangan bila ada" value={keterangan} />
      </div>

      {error && <p className="px-6 pb-4 text-sm font-medium text-error">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
        <Button onClick={() => router.push("/reports/monthly-results")} type="button" variant="outline">Batal</Button>
        <Button disabled={isLoading || isSaving} type="submit">{isEditMode ? "Simpan Perubahan" : "Tambah Laporan"}</Button>
      </div>

      <ConfirmationDialog
        confirmLabel={isEditMode ? "Ya, Simpan" : "Ya, Tambah"}
        description={<>Data periode <strong className="text-text-primary">{formatPeriodLabel(period)}</strong> akan {isEditMode ? "diperbarui" : "ditambahkan"}.</>}
        isLoading={isSaving}
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => void persistReport()}
        title={isEditMode ? "Simpan perubahan kegiatan penimbangan?" : "Tambah kegiatan penimbangan?"}
      />
    </Form>
  );
}

function AutomaticSummary({ isLoading, overview }: { isLoading: boolean; overview: MonthlyResultsOverview | null }) {
  const address = overview?.address;
  const weighing = overview?.weighingActivities;
  const addressText = [
    address?.rt ? `RT ${address.rt}` : null,
    address?.rw ? `RW ${address.rw}` : null,
    address?.villageName,
    address?.districtName,
    address?.cityName,
  ].filter(Boolean).join(", ");

  const items = [
    ["Jumlah Kader", overview?.cadres.total],
    ["Kader Hadir", overview?.cadres.present],
    ["Ibu Hamil", overview?.pregnantAndPostpartum.totalPregnantWomen],
    ["Mendapat Tablet FE", overview?.pregnantAndPostpartum.pregnantWomenReceivedIron],
    ["Semua Bayi/Balita", weighing?.registeredChildren.total.total],
    ["Memiliki KMS", weighing?.childrenWithKms.total.total],
    ["Ditimbang", weighing?.weighedChildren.total.total],
    ["Berat Badan Naik", weighing?.nutritionGuide.weightUp.total.total],
    ["Berat Badan Tidak Naik", weighing?.nutritionGuide.weightNotUp.total.total],
    ["Tidak Menimbang Bulan Lalu", weighing?.nutritionGuide.notWeighedLastMonth.total.total],
    ["Pertama Kali Menimbang", weighing?.nutritionGuide.firstWeighing.total.total],
    ["Mencapai Usia 6 Bulan", weighing?.reachedSixMonthsThisMonth.total],
    ["Vitamin A Biru", overview?.vitaminA.blueCapsuleAge6To11Months.total],
    ["Vitamin A Merah", overview?.vitaminA.redCapsuleAge12To59Months.total],
  ] as const;

  return (
    <section className="border-b border-border bg-primary/[0.025] p-6">
      <h2 className="font-extrabold text-text-primary">Ringkasan Data Otomatis</h2>
      <p className="mt-1 text-sm text-text-secondary">Referensi singkat dari data Posyandu, kehadiran, dan penimbangan pada periode terpilih.</p>
      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="font-bold text-text-primary">{isLoading ? "Memuat Posyandu…" : address?.posyanduName ?? "-"}</p>
        <p className="mt-1 text-sm text-text-secondary">{isLoading ? "Memuat alamat…" : addressText || "Alamat belum tersedia"}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(([label, value]) => (
          <div className="rounded-xl border border-border bg-surface p-3" key={label}>
            <p className="text-xs font-semibold text-text-secondary">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-primary">{isLoading ? "…" : value ?? "-"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NumberInput({ label, name, onChange, value }: { label: string; name: NumberField; onChange: Dispatch<SetStateAction<Record<NumberField, string>>>; value: string }) {
  return <FormField label={label} min="0" name={name} onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))} required step="1" type="number" value={value} />;
}

function BooleanRadioGroup({ onChange, value }: { onChange: (value: BooleanValue) => void; value: BooleanValue }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-text-primary">Ibu Nifas Mendapat Vitamin A Merah</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["true", "false"] as const).map((option) => (
          <label className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition ${value === option ? "border-primary bg-primary text-white" : "border-border bg-surface text-text-secondary hover:border-primary/50"}`} key={option}>
            <input checked={value === option} className="sr-only" name="dapat_vit_a_merah" onChange={() => onChange(option)} type="radio" value={option} />
            {option === "true" ? "Ada" : "Tidak"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FormSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return <section className="border-t border-border p-6"><h2 className="font-extrabold text-text-primary">{title}</h2><p className="mt-1 text-sm text-text-secondary">{description}</p><div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div></section>;
}

function createEmptyNumbers() {
  return Object.fromEntries(numberFields.map(([name]) => [name, "0"])) as Record<NumberField, string>;
}

function toNonNegativeInteger(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

function normalizeInitialPeriod(value: string | null) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function formatPeriodLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}
