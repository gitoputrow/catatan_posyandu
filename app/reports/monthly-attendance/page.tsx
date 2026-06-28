import type { Metadata } from "next";
import { Suspense } from "react";

import { MonthlyAttendanceManager } from "@/components/reports/monthly-attendance/monthly-attendance-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Kehadiran Bulanan | CatatanPosyandu",
};

export default function MonthlyAttendancePage() {
  return <Suspense fallback={<PageLoading />}><MonthlyAttendanceManager /></Suspense>;
}
