"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";

const statCards = [
  { label: "Total Balita", value: "128", detail: "+6 bulan ini", color: "bg-primary/10 text-primary", icon: "children" },
  { label: "Sudah Ditimbang", value: "96", detail: "75% dari total", color: "bg-success/15 text-[#5E8D2B]", icon: "scale" },
  { label: "Belum Ditimbang", value: "32", detail: "Perlu diingatkan", color: "bg-warning/15 text-warning", icon: "clock" },
  { label: "Perlu Perhatian", value: "8", detail: "Pantau pertumbuhan", color: "bg-accent/10 text-accent", icon: "heart" },
];

const recentRecords = [
  { name: "Aisyah Putri", age: "2 tahun 4 bulan", weight: "12,4 kg", status: "Normal", initials: "AP", color: "bg-[#D9F3EE] text-primary" },
  { name: "Rafif Ramadhan", age: "1 tahun 8 bulan", weight: "10,2 kg", status: "Normal", initials: "RR", color: "bg-[#EAF5D9] text-[#5E8D2B]" },
  { name: "Nayla Zahra", age: "3 tahun 1 bulan", weight: "13,1 kg", status: "Perlu dipantau", initials: "NZ", color: "bg-[#FFE3E1] text-accent" },
];

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState("2026");

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Senin, 22 Juni 2026</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
            Selamat pagi, Ibu Siti!
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Berikut ringkasan kegiatan Posyandu Melati 01 hari ini.
          </p>
        </div>
        <Button className="shrink-0" size="md">
          <span className="text-lg leading-none">+</span>
          Input Penimbangan
        </Button>
      </header>

      <section aria-label="Ringkasan data" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm" key={card.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-secondary">{card.label}</p>
                <p className="mt-2 text-3xl font-extrabold tracking-tight text-text-primary">{card.value}</p>
              </div>
              <div className={`grid size-10 place-items-center rounded-xl ${card.color}`}>
                <StatIcon name={card.icon} />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-text-secondary">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-text-primary">Tren Penimbangan</h2>
              <p className="mt-1 text-sm text-text-secondary">Jumlah balita yang ditimbang per bulan</p>
            </div>
            <SearchableSelect ariaLabel="Pilih tahun" className="w-28" onValueChange={setSelectedYear} options={[{ label: "2026", value: "2026" }]} value={selectedYear} />
          </div>
          <div className="mt-8 h-52">
            <svg aria-label="Grafik tren penimbangan" className="size-full overflow-visible" role="img" viewBox="0 0 600 200">
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#13A698" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#13A698" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 165H600M0 110H600M0 55H600" stroke="#DDEDEA" strokeDasharray="4 5" />
              <path d="M0 145 C35 132 53 128 83 125 S135 96 167 105 S218 111 250 83 S300 70 333 78 S384 50 416 56 S468 45 500 31 S550 37 600 16 V200 H0Z" fill="url(#chartFill)" />
              <path d="M0 145 C35 132 53 128 83 125 S135 96 167 105 S218 111 250 83 S300 70 333 78 S384 50 416 56 S468 45 500 31 S550 37 600 16" fill="none" stroke="#13A698" strokeLinecap="round" strokeWidth="4" />
              <circle cx="600" cy="16" fill="#13A698" r="5" />
            </svg>
          </div>
          <div className="mt-3 flex justify-between text-xs text-text-disabled">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-text-primary">Agenda Terdekat</h2>
              <p className="mt-1 text-sm text-text-secondary">Kegiatan Posyandu bulan ini</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">Juni</span>
          </div>
          <div className="mt-6 space-y-5 border-l-2 border-border pl-5">
            <AgendaItem date="25" month="JUN" title="Posyandu Balita" detail="08.00 - 11.00 · Balai RW 03" />
            <AgendaItem date="28" month="JUN" title="Rekap Laporan Bulanan" detail="13.00 · Sekretariat RW" />
            <AgendaItem date="03" month="JUL" title="Pemberian Vitamin A" detail="08.00 - 10.00 · Posyandu Melati" />
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-text-primary">Penimbangan Terbaru</h2>
            <p className="mt-1 text-sm text-text-secondary">Data yang baru dicatat hari ini</p>
          </div>
          <button className="text-sm font-bold text-primary hover:text-primary/80" type="button">Lihat semua</button>
        </div>
        <div className="mt-5 divide-y divide-border">
          {recentRecords.map((record) => (
            <div className="flex items-center gap-3 py-4 first:pt-0 last:pb-0" key={record.name}>
              <div className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${record.color}`}>{record.initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text-primary">{record.name}</p>
                <p className="mt-0.5 text-xs text-text-secondary">{record.age} · {record.weight}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.status === "Normal" ? "bg-success/15 text-[#5E8D2B]" : "bg-warning/15 text-warning"}`}>{record.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function AgendaItem({ date, detail, month, title }: { date: string; detail: string; month: string; title: string }) {
  return (
    <div className="relative flex gap-3">
      <span className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-surface bg-primary" />
      <div className="w-8 text-center"><p className="text-lg font-extrabold leading-5 text-text-primary">{date}</p><p className="mt-1 text-[10px] font-bold text-text-disabled">{month}</p></div>
      <div><p className="text-sm font-bold text-text-primary">{title}</p><p className="mt-1 text-xs text-text-secondary">{detail}</p></div>
    </div>
  );
}

function StatIcon({ name }: { name: string }) {
  const common = { "aria-hidden": true, fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24" };
  if (name === "children") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.6-3.5 2.5-5.2 5.5-5.2s4.9 1.7 5.5 5.2M16 5.5a2.5 2.5 0 010 5M17.5 14.8c1.7.7 2.7 2.4 3 5.2" /></svg>;
  if (name === "scale") return <svg {...common}><path d="M4 7h16l-2 13H6zM12 7V4M9.5 13a2.5 2.5 0 015 0" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
  return <svg {...common}><path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10a4 4 0 017-2.6A4 4 0 0120 8.5z" /></svg>;
}
