import type { Metadata } from "next";
import { Suspense } from "react";

import { WriteAccessGuard } from "@/components/auth/write-access-guard";
import { MonthlyResultsForm } from "@/components/reports/monthly-results/monthly-results-form";
import { BackLink } from "@/components/ui/back-link";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Tambah Kegiatan Penimbangan | CatatanPosyandu",
};

export default function CreateMonthlyResultsPage() {
  return (
    <WriteAccessGuard>
      <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p>
              <h1 className="mt-1 text-2xl font-extrabold text-text-primary">Tambah atau Edit Kegiatan Penimbangan</h1>
              <p className="mt-1 text-sm text-text-secondary">Lengkapi data manual untuk periode laporan yang dipilih.</p>
            </div>
            <BackLink href="/reports/monthly-results" />
          </div>
          <Suspense fallback={<PageLoading />}>
            <MonthlyResultsForm />
          </Suspense>
        </div>
      </main>
    </WriteAccessGuard>
  );
}
