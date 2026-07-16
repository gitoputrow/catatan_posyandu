"use client";

import { useState } from "react";

import { GrowthRecordForm } from "@/components/growth-record/growth-record-form";
import { BackLink } from "@/components/ui/back-link";

export function CreateGrowthRecordPage() {
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div><p className="text-sm font-semibold text-primary">PEMANTAUAN BALITA</p><h1 className="mt-1 text-2xl font-extrabold text-text-primary">{isUpdateMode ? "Update Catatan Pertumbuhan" : "Tambah Catatan Pertumbuhan"}</h1><p className="mt-1 text-sm text-text-secondary">{isUpdateMode ? "Perbarui hasil pengukuran yang sudah tersedia pada periode ini." : "Simpan hasil pengukuran balita untuk periode yang dipilih."}</p></div>
          <BackLink href="/growth-recording" />
        </div>
        <GrowthRecordForm onModeChange={setIsUpdateMode} />
      </div>
    </main>
  );
}
