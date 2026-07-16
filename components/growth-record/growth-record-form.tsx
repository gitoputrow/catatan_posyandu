"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Child } from "@/components/children/types";
import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormSelect, FormTextarea, SearchableSelect } from "@/components/ui/form";
import { getAllChildren } from "@/lib/children/api";
import { createGrowthRecord, getAllGrowthRecords, updateGrowthRecord } from "@/lib/growth-record/api";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function GrowthRecordForm({ onModeChange }: { onModeChange?: (isUpdateMode: boolean) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [children, setChildren] = useState<Child[]>([]);
  const [existingRecords, setExistingRecords] = useState<GrowthRecordViewModel[]>([]);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    balita_id: "",
    tanggal_pengukuran: formatInputDate(today),
    berat_badan: "",
    tinggi_badan: "",
    lingkar_kepala: "",
    lingkar_lengan: "",
    catatan: "",
  });

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingChildren(true);
      void Promise.all([getAllChildren(month, year), getAllGrowthRecords(month, year)])
        .then(([childrenData, recordsData]) => {
          if (isMounted) {
            setChildren(childrenData);
            setExistingRecords(recordsData);
          }
        })
        .catch((loadError) => {
          if (isMounted) setError(loadError instanceof Error ? loadError.message : "Data balita gagal dimuat.");
        })
        .finally(() => {
          if (isMounted) setIsLoadingChildren(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [month, year]);

  function updateField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function selectChild(childId: string) {
    const existing = existingRecords.find((record) => record.balita_id === childId && record.id);
    const isUpdateMode = Boolean(existing?.id);
    setExistingRecordId(existing?.id ?? null);
    onModeChange?.(isUpdateMode);
    setForm({
      balita_id: childId,
      tanggal_pengukuran: existing?.tanggal_pengukuran
        ? toDateInputValue(existing.tanggal_pengukuran)
        : formatInputDate(new Date()),
      berat_badan: valueToInput(existing?.berat_badan),
      tinggi_badan: valueToInput(existing?.tinggi_badan),
      lingkar_kepala: valueToInput(existing?.lingkar_kepala),
      lingkar_lengan: valueToInput(existing?.lingkar_lengan),
      catatan: existing?.catatan ?? "",
    });
  }

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    setIsLoadingChildren(true);
    setChildren([]);
    setExistingRecords([]);
    setExistingRecordId(null);
    onModeChange?.(false);
    setForm((current) => ({
      ...current,
      balita_id: "",
      tanggal_pengukuran: formatInputDate(new Date()),
      berat_badan: "",
      tinggi_badan: "",
      lingkar_kepala: "",
      lingkar_lengan: "",
      catatan: "",
    }));
  }

  function goToCreateChild() {
    const redirect = `/growth-recording/create?month=${month}&year=${year}`;
    router.push(`/children/create?redirect=${encodeURIComponent(redirect)}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const values = {
        tanggal_pengukuran: form.tanggal_pengukuran || null,
        berat_badan: toNumberOrNull(form.berat_badan),
        tinggi_badan: toNumberOrNull(form.tinggi_badan),
        lingkar_kepala: toNumberOrNull(form.lingkar_kepala),
        lingkar_lengan: toNumberOrNull(form.lingkar_lengan),
        catatan: form.catatan.trim() || null,
      };
      if (existingRecordId) {
        await updateGrowthRecord(existingRecordId, values);
      } else {
        await createGrowthRecord({
          ...values,
          balita_id: form.balita_id,
          periode_bulan: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
        });
      }
      router.push(`/growth-recording?month=${month}&year=${year}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Catatan pertumbuhan gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <div className="grid gap-5 p-6 sm:grid-cols-2">
        <FormSelect label="Bulan" onChange={(event) => changePeriod(Number(event.target.value), year)} value={month}>
          {monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
        </FormSelect>
        <FormSelect label="Tahun" onChange={(event) => changePeriod(month, Number(event.target.value))} value={year}>
          {Array.from({ length: 6 }, (_, index) => today.getFullYear() - index).map((option) => <option key={option} value={option}>{option}</option>)}
        </FormSelect>
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-text-primary">
            Balita
            <SearchableSelect
              action={{ label: "+ Tambah Balita", onClick: goToCreateChild }}
              className="mt-2"
              disabled={isLoadingChildren}
              name="balita_id"
              onValueChange={selectChild}
              options={children.map((child) => ({
                label: `${child.nama_anak}${child.nik_anak ? ` - ${child.nik_anak}` : ""}`,
                value: child.id,
              }))}
              placeholder={isLoadingChildren ? "Memuat balita..." : "Pilih balita"}
              required
              value={form.balita_id}
            />
          </label>
        </div>
        <FormField label="Tanggal pengukuran" name="tanggal_pengukuran" onValueChange={updateField} type="date" value={form.tanggal_pengukuran} />
        <FormField label="Berat badan (kg)" min="0" name="berat_badan" onValueChange={updateField} step="0.01" type="number" value={form.berat_badan} />
        <FormField label="Tinggi badan (cm)" min="0" name="tinggi_badan" onValueChange={updateField} step="0.1" type="number" value={form.tinggi_badan} />
        <FormField label="Lingkar kepala (cm)" min="0" name="lingkar_kepala" onValueChange={updateField} step="0.1" type="number" value={form.lingkar_kepala} />
        <FormField label="Lingkar lengan (cm)" min="0" name="lingkar_lengan" onValueChange={updateField} step="0.1" type="number" value={form.lingkar_lengan} />
        <FormTextarea className="sm:col-span-2" label="Catatan" onChange={(event) => updateField("catatan", event.target.value)} value={form.catatan} />
      </div>
      {error && <p className="px-6 pb-4 text-sm font-medium text-error">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Button onClick={() => router.push("/growth-recording")} type="button" variant="outline">Batal</Button>
        <Button isLoading={isSaving} type="submit">{existingRecordId ? "Update Catatan" : "Simpan Catatan"}</Button>
      </div>
    </Form>
  );
}

function toNumberOrNull(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function toDateInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatInputDate(date);
}

function valueToInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}
