"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { GebyarReport } from "@/components/reports/gebyar/types";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/form";
import { useCurrentUser } from "@/components/user/user-provider";
import { getGebyarReport } from "@/lib/reports/gebyar/api";
import { exportGebyarReport } from "@/lib/reports/gebyar/export";
import { getUser } from "@/lib/user/api";

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function GebyarReportManager() {
  const { canManage } = useCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date();
  const [month, setMonth] = useState(() => parseMonth(searchParams.get("month"), today.getMonth() + 1));
  const [year, setYear] = useState(() => parseYear(searchParams.get("year"), today.getFullYear()));
  const [report, setReport] = useState<GebyarReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monthOptions = monthNames.map((label, index) => ({ label, value: String(index + 1) }));
  const yearOptions = Array.from({ length: 6 }, (_, index) => {
    const value = today.getFullYear() - index;
    return { label: String(value), value: String(value) };
  });

  useEffect(() => {
    let isActive = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getGebyarReport(month, year);
        if (isActive) setReport(result);
      } catch (loadError) {
        if (isActive) setError(loadError instanceof Error ? loadError.message : "Gebyar Bulanan gagal dimuat.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    })();
    return () => { isActive = false; };
  }, [month, year]);

  function changePeriod(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    router.replace(`/reports/gebyar?${new URLSearchParams({ month: String(nextMonth), year: String(nextYear) })}`);
  }

  const identity = report?.identity;

  async function exportReport() {
    if (!report) return;
    setIsExporting(true);
    setError(null);
    try {
      exportGebyarReport(report, await getUser());
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Gebyar Bulanan gagal diekspor.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <header className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Gebyar Bulanan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Gabungan laporan kehadiran, kegiatan, dan data pendukung Posyandu.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[10rem_8rem]">
            <SearchableSelect ariaLabel="Pilih bulan" onValueChange={(value) => changePeriod(Number(value), year)} options={monthOptions} value={month} />
            <SearchableSelect ariaLabel="Pilih tahun" onValueChange={(value) => changePeriod(month, Number(value))} options={yearOptions} value={year} />
          </div>
          <Button disabled={!report || isExporting} onClick={() => void exportReport()} variant="outline">{isExporting ? "Mengekspor..." : "Export"}</Button>
          {canManage && <Button disabled={isLoading} onClick={() => router.push(`/reports/gebyar/create?period=${year}-${String(month).padStart(2, "0")}`)}>{report?.savedReport ? "Edit" : "Tambah"}</Button>}
        </div>
      </header>

      {error && <p className="mt-6 rounded-xl border border-error/20 bg-error/5 px-5 py-4 text-sm font-medium text-error">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Identitas Posyandu</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">{monthNames[month - 1]} {year}</h2>
          <p className="mt-1 text-sm text-text-secondary">Informasi Posyandu dan kehadiran kader pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat identitas Posyandu...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
            <IdentityItem label="Nama Posyandu" value={identity?.posyanduName} />
            <IdentityItem label="Alamat" value={identity?.address} />
            <IdentityItem label="Kecamatan" value={identity?.districtName} />
            <IdentityItem label="Kota / Kabupaten" value={identity?.cityOrRegency} />
            <IdentityItem label="Jumlah Kader" value={identity?.totalCadres} />
            <IdentityItem label="Kader Hadir" value={identity?.presentCadres} />
          </dl>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Hasil Kegiatan</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Rekap Hasil Kegiatan</h2>
          <p className="mt-1 text-sm text-text-secondary">Seluruh bagian hasil kegiatan pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat hasil kegiatan...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-background text-xs font-bold uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="w-[32%] px-5 py-3">Uraian</th>
                  <th className="px-5 py-3">Keterangan</th>
                  <th className="w-32 px-5 py-3 text-center">Hasil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <ActivityGroupRow title="1. Kesehatan Ibu dan Anak" />
                <ActivityTableRow description="Berdasarkan jumlah ibu hamil pada laporan kehadiran." label="Jumlah Bumil" value={report?.healthOfMotherAndChild.totalPregnantWomen ?? 0} />
                <ActivityTableRow description="Jumlah bumil bila pemeriksaan ditandai dilakukan pada laporan kegiatan." label="Bumil Diperiksa" value={report?.healthOfMotherAndChild.pregnantWomenExamined ?? "-"} />
                <ActivityTableRow description="Status pemberian vitamin A bagi balita pada laporan kegiatan." label="Pemberian Vitamin A" value={formatActivityStatus(report?.healthOfMotherAndChild.vitaminAProvided)} />

                <ActivityGroupRow title="2. KB (Keluarga Berencana)" />
                <ActivityTableRow description="Jumlah Pasangan Usia Subur berdasarkan laporan kehadiran." label="PUS Binaan" value={report?.familyPlanning.coachedCouplesOfReproductiveAge ?? 0} />
                <ActivityTableRow description="Sumber data peserta KB binaan belum ditentukan." label="Peserta KB Binaan" value={report?.familyPlanning.coachedParticipants ?? "-"} />
                <ActivityTableRow description="Akumulasi seluruh metode pelayanan KB di bawah ini." emphasized label="Peserta KB yang Dilayani" value={report?.familyPlanning.servedParticipants?.total ?? "-"} />
                <ActivityTableRow child label="IUD" value={report?.familyPlanning.servedParticipants?.iud ?? "-"} />
                <ActivityTableRow child label="Implant" value={report?.familyPlanning.servedParticipants?.implant ?? "-"} />
                <ActivityTableRow child label="Suntik" value={report?.familyPlanning.servedParticipants?.injection ?? "-"} />
                <ActivityTableRow child label="Pil" value={report?.familyPlanning.servedParticipants?.pill ?? "-"} />
                <ActivityTableRow child label="Kondom" value={report?.familyPlanning.servedParticipants?.condom ?? "-"} />
                <ActivityTableRow child label="Steril (MOP + MOW)" value={report?.familyPlanning.servedParticipants?.sterilization ?? "-"} />

                <ActivityGroupRow title="3. GIZI" />
                <ActivityTableRow description="Jumlah seluruh balita aktif pada periode yang dipilih." label="Jumlah Seluruh Balita" value={report?.nutrition.totalChildren ?? 0} />
                <ActivityTableRow description="Mengikuti status kepemilikan KMS pada laporan kegiatan." label="Balita yang Memiliki KMS" value={report?.nutrition.hasKms ?? "-"} />
                <ActivityTableRow description="Balita yang memiliki catatan berat badan bulan ini." label="Balita Ditimbang" value={report?.nutrition.weighedChildren ?? 0} />
                <ActivityTableRow description="Berat bulan ini lebih tinggi dari catatan sebelumnya." label="Balita Naik Berat Badan" value={report?.nutrition.weightUp ?? 0} />
                <ActivityTableRow description="Memiliki pembanding dan berat bulan ini tidak lebih tinggi." label="Balita Tidak Naik Berat Badan" value={report?.nutrition.weightNotUp ?? 0} />
                <ActivityTableRow description="Belum memiliki catatan berat badan sebelum bulan ini." label="Balita Pertama Kali Ditimbang" value={report?.nutrition.firstWeighing ?? 0} />
                <ActivityTableRow description="Ditimbang bulan ini, tetapi tidak memiliki catatan pada bulan sebelumnya." label="Ditimbang Bulan Ini, Tidak Bulan Lalu" value={report?.nutrition.notWeighedLastMonth ?? 0} />
                <ActivityTableRow description="Belum dapat dihitung karena status atau referensi garis merah belum tersedia." label="Balita Berat Badan di Bawah Garis Merah (BGM)" value={report?.nutrition.belowRedLine ?? "-"} />

                <ActivityGroupRow title="4. Imunisasi" />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat BCG." label="BCG" value={report?.immunization.bcg ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Polio 1." label="Polio 1" value={report?.immunization.polio1 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Polio 2." label="Polio 2" value={report?.immunization.polio2 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Polio 3." label="Polio 3" value={report?.immunization.polio3 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Polio 4." label="Polio 4" value={report?.immunization.polio4 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Campak." label="Campak" value={report?.immunization.campak ?? "-"} />
                <ActivityTableRow description="Jumlah ibu hamil bila imunisasi TT 1 ditandai dilakukan." label="Imunisasi TT Ibu Hamil 1" value={report?.immunization.pregnantWomenTt1 ?? "-"} />
                <ActivityTableRow description="Jumlah ibu hamil bila imunisasi TT 2 ditandai dilakukan." label="Imunisasi TT Ibu Hamil 2" value={report?.immunization.pregnantWomenTt2 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat DPT 1." label="DPT 1" value={report?.immunization.dpt1 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat DPT 2." label="DPT 2" value={report?.immunization.dpt2 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat DPT 3." label="DPT 3" value={report?.immunization.dpt3 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Hepatitis B 1." label="Hepatitis B 1" value={report?.immunization.hepatitis1 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Hepatitis B 2." label="Hepatitis B 2" value={report?.immunization.hepatitis2 ?? "-"} />
                <ActivityTableRow description="Total bayi laki-laki dan perempuan yang mendapat Hepatitis B 3." label="Hepatitis B 3" value={report?.immunization.hepatitis3 ?? "-"} />

                <ActivityGroupRow title="5. Pencegahan Diare" />
                <ActivityTableRow description="Total balita laki-laki dan perempuan yang diduga mengalami diare." label="Balita yang Diduga Diare" value={report?.diarrheaPrevention.childrenSuspectedDiarrhea ?? "-"} />
                <ActivityTableRow description="Total balita laki-laki dan perempuan yang diberi oralit." label="Balita yang Diberi Oralit" value={report?.diarrheaPrevention.childrenGivenOralit ?? "-"} />

                <ActivityGroupRow title="6. Pemberian Makanan Tambahan" />
                <ActivityTableRow description="Status pemberian makanan tambahan berdasarkan laporan Gebyar pada periode yang dipilih." label="Pemberian Makanan Tambahan" value={formatAvailability(report?.supplementaryFeeding)} />
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Program Tambahan</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Rekap Program Tambahan</h2>
          <p className="mt-1 text-sm text-text-secondary">Jumlah kegiatan program tambahan pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat program tambahan...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            <ProgramItem label="Jumlah PPKS" value={report?.additionalPrograms.ppks} />
            <ProgramItem label="Jumlah BKB" value={report?.additionalPrograms.bkb} />
            <ProgramItem label="Jumlah PAUD" value={report?.additionalPrograms.paud} />
            <ProgramItem label="Pembinaan Lansia" value={report?.additionalPrograms.elderlyDevelopment} />
            <ProgramItem label="Gerakan Sayang Ibu (GSI)" value={report?.additionalPrograms.gsi} />
            <ProgramItem label="Pemberantasan Sarang Nyamuk (PSN)" value={report?.additionalPrograms.psn} />
            <ProgramItem label="Jumlah Lain-lain" value={report?.additionalPrograms.other} />
          </dl>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Mitra Posyandu</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Mitra Posyandu yang Terlibat</h2>
          <p className="mt-1 text-sm text-text-secondary">Jumlah mitra yang terlibat pada periode yang dipilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data mitra Posyandu...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
            <ProgramItem label="Jumlah Perusahaan" value={report?.involvedPartners.company} />
            <ProgramItem label="Jumlah BUMN / BUMD" value={report?.involvedPartners.bumnOrBumd} />
            <ProgramItem label="Jumlah Kantor / Dinas" value={report?.involvedPartners.governmentOffice} />
            <ProgramItem label="Jumlah LSM / LSOM" value={report?.involvedPartners.lsmOrLsom} />
          </dl>
        )}
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Dana Sehat</p>
          <h2 className="mt-1 text-xl font-extrabold text-text-primary">Rekap Dana Sehat</h2>
          <p className="mt-1 text-sm text-text-secondary">Rekap keluarga sasaran dan keluarga yang menyumbang pada periode terpilih.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-text-secondary">Memuat data dana sehat...</p>
        ) : (
          <dl className="grid gap-px bg-border sm:grid-cols-3">
            <ProgramItem label="Jumlah Keluarga Sasaran" value={report?.healthyFund.targetFamilies} />
            <ProgramItem label="Jumlah Keluarga Menyumbang" value={report?.healthyFund.contributingFamilies} />
            <ProgramItem emphasized label="Total" value={report?.healthyFund.total} />
          </dl>
        )}
      </section>
    </main>
  );
}

function ProgramItem({ emphasized = false, label, value }: { emphasized?: boolean; label: string; value: number | null | undefined }) {
  return (
    <div className={emphasized ? "bg-primary/10 px-5 py-5" : "bg-surface px-5 py-5"}>
      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className={`mt-2 text-2xl font-extrabold ${emphasized ? "text-primary" : "text-text-primary"}`}>{value ?? "-"}</dd>
    </div>
  );
}

function ActivityGroupRow({ title }: { title: string }) {
  return (
    <tr className="bg-primary/10">
      <th className="px-5 py-3 text-sm font-extrabold text-primary" colSpan={3} scope="rowgroup">{title}</th>
    </tr>
  );
}

function ActivityTableRow({ child = false, description = "", emphasized = false, label, value }: { child?: boolean; description?: string; emphasized?: boolean; label: string; value: number | string }) {
  return (
    <tr className={child ? "bg-background/60" : "bg-surface"}>
      <th className={`px-5 py-4 text-text-primary ${child ? "pl-10 font-semibold" : "font-bold"}`} scope="row">{child ? `↳ ${label}` : label}</th>
      <td className="px-5 py-4 text-xs leading-5 text-text-secondary">{description || "-"}</td>
      <td className={`px-5 py-4 text-center ${emphasized ? "font-extrabold text-primary" : "font-bold text-text-primary"}`}>{value}</td>
    </tr>
  );
}

function formatActivityStatus(value: boolean | null | undefined) {
  if (value === true) return "Dilakukan";
  if (value === false) return "Tidak dilakukan";
  return "Belum diisi";
}

function formatAvailability(value: boolean | null | undefined) {
  if (value === true) return "Ada";
  if (value === false) return "Tidak Ada";
  return "Belum diisi";
}

function IdentityItem({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-xs font-bold uppercase tracking-wide text-text-secondary">{label}</dt>
      <dd className="mt-2 text-base font-extrabold text-text-primary">{value ?? "-"}</dd>
    </div>
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
