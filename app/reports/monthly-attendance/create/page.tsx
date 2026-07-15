import type { Metadata } from "next";
import { Suspense } from "react";

import { MonthlyAttendanceForm } from "@/components/reports/monthly-attendance/monthly-attendance-form";
import { WriteAccessGuard } from "@/components/auth/write-access-guard";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Form Laporan Kehadiran | CatatanPosyandu",
};

export default function CreateMonthlyAttendancePage() {
  return <WriteAccessGuard><main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10"><div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface"><div className="border-b border-border px-6 py-5"><p className="text-sm font-semibold text-primary">LAPORAN POSYANDU</p><h1 className="mt-1 text-2xl font-extrabold text-text-primary">Laporan Kehadiran Bulanan</h1><p className="mt-1 text-sm text-text-secondary">Tambah atau perbarui laporan kehadiran untuk periode yang dipilih.</p></div><Suspense fallback={<PageLoading />}><MonthlyAttendanceForm /></Suspense></div></main></WriteAccessGuard>;
}
