import type { Metadata } from "next";
import { Suspense } from "react";

import { MonthlyActivityManager } from "@/components/reports/monthly-activity/monthly-activity-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Kegiatan Bulanan | CatatanPosyandu",
};

export default function MonthlyActivityPage() {
  return <Suspense fallback={<PageLoading />}><MonthlyActivityManager /></Suspense>;
}
