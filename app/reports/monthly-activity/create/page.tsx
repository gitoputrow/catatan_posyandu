import type { Metadata } from "next";
import { Suspense } from "react";

import { WriteAccessGuard } from "@/components/auth/write-access-guard";
import { MonthlyActivityForm } from "@/components/reports/monthly-activity/monthly-activity-form";
import { PageLoading } from "@/components/ui/page-loading";
import { BackLink } from "@/components/ui/back-link";

export const metadata: Metadata = {
  title: "Tambah Laporan Kegiatan | CatatanPosyandu",
};

export default function CreateMonthlyActivityPage() {
  return (
    <WriteAccessGuard>
      <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div><p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p><h1 className="mt-1 text-2xl font-extrabold text-text-primary">Laporan Kegiatan Bulanan</h1><p className="mt-1 text-sm text-text-secondary">Tambah atau perbarui laporan kegiatan untuk periode yang dipilih.</p></div>
            <BackLink href="/reports/monthly-activity" />
          </div>
          <Suspense fallback={<PageLoading />}>
            <MonthlyActivityForm />
          </Suspense>
        </div>
      </main>
    </WriteAccessGuard>
  );
}
