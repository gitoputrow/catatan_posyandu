"use client";

import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { MetricChange } from "@/components/ui/metric-change";

type GrowthRecordCardProps = {
  onAdd: () => void;
  onDelete: () => void;
  onEdit: () => void;
  readOnly?: boolean;
  record: GrowthRecordViewModel;
  referenceDate: Date;
};

export function GrowthRecordCard({ onAdd, onDelete, onEdit, readOnly = false, record, referenceDate }: GrowthRecordCardProps) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-extrabold leading-snug text-text-primary">{record.nama}</h3>
          <p className="mt-1.5 text-xs font-medium text-text-secondary">{record.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"} · {getAgeInMonths(record.tanggal_lahir, referenceDate)}</p>
        </div>
        <GrowthRecordActions onAdd={onAdd} onDelete={onDelete} onEdit={onEdit} readOnly={readOnly} record={record} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <MetricCard change={record.perubahan_berat_badan} label="Berat badan" unit="kg" value={record.berat_badan} />
        <MetricCard change={record.perubahan_tinggi_badan} label="Tinggi badan" unit="cm" value={record.tinggi_badan} />
        <MetricCard change={record.perubahan_lingkar_kepala} label="Lingkar kepala" unit="cm" value={record.lingkar_kepala} />
        <MetricCard change={record.perubahan_lingkar_lengan} label="Lingkar lengan" unit="cm" value={record.lingkar_lengan} />
      </div>
    </article>
  );
}

export function GrowthRecordActions({ onAdd, onDelete, onEdit, readOnly = false, record }: Omit<GrowthRecordCardProps, "referenceDate">) {
  if (readOnly) return null;
  const hasMeasurement = [record.berat_badan, record.tinggi_badan, record.lingkar_kepala, record.lingkar_lengan].some((value) => value !== null);
  return <div className="flex shrink-0 justify-end gap-1">{hasMeasurement ? <>
    <button aria-label={`Edit catatan ${record.nama}`} className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10" onClick={onEdit} type="button"><EditIcon /></button>
    <button aria-label={`Hapus catatan ${record.nama}`} className="rounded-lg p-1.5 text-error transition hover:bg-error/10" onClick={onDelete} type="button"><TrashIcon /></button>
  </> : <button aria-label={`Tambah catatan ${record.nama}`} className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10" onClick={onAdd} type="button"><PlusIcon /></button>}</div>;
}

function MetricCard({ change, label, unit, value }: { change?: number | null; label: string; unit: string; value: number | null }) {
  return <div className="rounded-lg bg-background py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-1 text-xs font-extrabold text-text-primary">{value === null ? "-" : `${value} ${unit}`}</p><MetricChange change={change} unit={unit} /></div>;
}

function getAgeInMonths(value: string, referenceDate: Date) {
  if (!value) return "-";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "-";
  const months = (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 + referenceDate.getMonth() - birthDate.getMonth() - (referenceDate.getDate() < birthDate.getDate() ? 1 : 0);
  return `${Math.max(0, months)} bln`;
}

function PlusIcon() { return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>; }
function EditIcon() { return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 20h4l11-11a2.8 2.8 0 00-4-4L4 16zM13.5 6.5l4 4" /></svg>; }
function TrashIcon() { return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" /></svg>; }
