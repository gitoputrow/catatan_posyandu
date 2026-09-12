"use client";

import { useEffect, type ReactNode } from "react";

import type { GrowthRecordViewModel } from "@/components/growth-record/types";

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function GrowthRecordDetailDialog({
  onClose,
  record,
}: {
  onClose: () => void;
  record: GrowthRecordViewModel | null;
}) {
  useEffect(() => {
    if (!record) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, record]);

  if (!record) return null;

  return (
    <div aria-labelledby="growth-record-detail-title" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-text-primary/45 p-3 sm:p-4" role="dialog">
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-lg sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-semibold text-primary">DETAIL PENCATATAN</p>
            <h2 className="mt-1 text-xl font-extrabold text-text-primary" id="growth-record-detail-title">{record.nama}</h2>
          </div>
          <button aria-label="Tutup detail pencatatan" className="grid size-9 cursor-pointer place-items-center rounded-lg text-text-secondary transition hover:bg-background" onClick={onClose} type="button">×</button>
        </header>

        <dl className="grid min-h-0 flex-1 gap-x-8 overflow-y-auto overscroll-contain px-5 py-3 sm:grid-cols-2 sm:px-6">
          <MetricDetail change={record.perubahan_berat_badan} label="Berat badan" unit="kg" value={record.berat_badan} />
          <MetricDetail change={record.perubahan_tinggi_badan} label="Tinggi badan" unit="cm" value={record.tinggi_badan} />
          <MetricDetail change={record.perubahan_lingkar_kepala} label="Lingkar kepala" unit="cm" value={record.lingkar_kepala} />
          <MetricDetail change={record.perubahan_lingkar_lengan} label="Lingkar lengan" unit="cm" value={record.lingkar_lengan} />
          <DetailItem label="Dicatat oleh" value={record.created_by_name ?? "-"} />
          <DetailItem label="Periode pencatatan" value={formatMonth(record.periode_bulan)} />
          <DetailItem label="Tanggal pencatatan" value={formatDate(record.tanggal_pengukuran)} />
        </dl>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return <div className="border-b border-border py-4"><dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt><dd className="mt-1.5 font-semibold text-text-primary">{value}</dd></div>;
}

function MetricDetail({
  change,
  label,
  unit,
  value,
}: {
  change: number | null;
  label: string;
  unit: string;
  value: number | null;
}) {
  return (
    <div className="border-b border-border py-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-1.5 font-semibold text-text-primary">{value === null ? "-" : `${numberFormatter.format(value)} ${unit}`}</dd>
      <GrowthChange change={change} hasValue={value !== null} unit={unit} />
    </div>
  );
}

function GrowthChange({ change, hasValue, unit }: { change: number | null; hasValue: boolean; unit: string }) {
  if (!hasValue) return <p className="mt-1 text-xs font-medium text-text-secondary">Belum ada hasil pengukuran</p>;
  if (change === null) return <p className="mt-1 text-xs font-medium text-text-secondary">Belum ada data bulan sebelumnya</p>;

  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
  const label = change > 0 ? "Naik" : change < 0 ? "Turun" : "Tetap";
  const color = change > 0 ? "text-[#5E8D2B]" : change < 0 ? "text-error" : "text-text-secondary";
  return (
    <p className={`mt-1 text-xs font-bold ${color}`}>
      <span aria-hidden="true">{arrow} </span>
      {label}{change !== 0 ? ` ${numberFormatter.format(Math.abs(change))} ${unit}` : ""}
    </p>
  );
}

function formatMonth(value: string | null) {
  if (!value) return "-";
  const match = value.match(/^\d{4}-(\d{2})/);
  const month = match ? Number(match[1]) : null;
  if (!month || month < 1 || month > 12) return "-";
  return new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2020, month - 1, 1));
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "-";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
