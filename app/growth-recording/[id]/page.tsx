"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import type { GrowthRecordViewModel } from "@/components/growth-record/types";
import { getGrowthRecordById } from "@/lib/growth-record/api";

export default function GrowthRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<GrowthRecordViewModel | null | undefined>(undefined);

  useEffect(() => {
    void getGrowthRecordById(id).then(setRecord).catch(() => setRecord(null));
  }, [id]);

  if (record === undefined) return <main className="min-h-screen bg-background" />;

  if (!record) {
    return <main className="grid min-h-screen place-items-center bg-background px-5 text-center"><div><h1 className="text-xl font-extrabold text-text-primary">Data pertumbuhan tidak ditemukan</h1><Link className="mt-3 inline-block text-sm font-bold text-primary" href="/growth-recording">Kembali ke Pencatatan Pertumbuhan</Link></div></main>;
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <Link className="inline-flex items-center gap-2 text-sm font-bold text-text-secondary transition hover:text-primary" href="/growth-recording"><span aria-hidden="true">←</span>Kembali ke Pencatatan Pertumbuhan</Link>
      <header className="mt-5 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6"><p className="text-sm font-semibold text-primary">DETAIL PERTUMBUHAN</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">{record.nama}</h1><p className="mt-2 text-sm text-text-secondary">Periode: {formatMonth(record.periode_bulan)} · Pengukuran: {formatDate(record.tanggal_pengukuran)}</p></header>
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <DetailCard title="Data Balita">
          <DetailItem label="Nama" value={record.nama} />
          <DetailItem label="NIK" value={record.nik_anak} />
          <DetailItem label="Jenis kelamin" value={record.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"} />
          <DetailItem label="Tanggal lahir" value={formatDate(record.tanggal_lahir)} />
          <DetailItem label="Nama ayah" value={record.nama_ayah} />
          <DetailItem label="Nama ibu" value={record.nama_ibu} />
          <DetailItem label="NIK orang tua" value={record.nik_ortu} />
          <DetailItem label="Alamat" value={record.alamat} />
        </DetailCard>
        <DetailCard title="Hasil Pengukuran">
          <DetailItem label="Periode bulan" value={formatMonth(record.periode_bulan)} />
          <DetailItem label="Tanggal pengukuran" value={formatDate(record.tanggal_pengukuran)} />
          <DetailItem label="Berat badan" value={withUnit(record.berat_badan, "kg")} />
          <DetailItem label="Tinggi badan" value={withUnit(record.tinggi_badan, "cm")} />
          <DetailItem label="Lingkar kepala" value={withUnit(record.lingkar_kepala, "cm")} />
          <DetailItem label="Lingkar lengan" value={withUnit(record.lingkar_lengan, "cm")} />
          <DetailItem label="Catatan" value={record.catatan} />
        </DetailCard>
      </section>
    </main>
  );
}

function DetailCard({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><h2 className="border-b border-border px-5 py-4 font-bold text-text-primary">{title}</h2><dl className="divide-y divide-border px-5">{children}</dl></section>;
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return <div className="grid grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)] gap-4 py-3 text-sm"><dt className="text-text-secondary">{label}</dt><dd className="break-all font-semibold text-text-primary">{value || "-"}</dd></div>;
}

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "-"; }
function formatMonth(value: string | null) { return value ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(value)) : "-"; }
function withUnit(value: number | null, unit: string) { return value === null ? "-" : `${value} ${unit}`; }
