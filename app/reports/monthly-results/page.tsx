import type { Metadata } from "next";
import { Suspense } from "react";

import { MonthlyResultsManager } from "@/components/reports/monthly-results/monthly-results-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Kegiatan Penimbangan | CatatanPosyandu",
};

export default function MonthlyResultsPage() {
  return <Suspense fallback={<PageLoading />}><MonthlyResultsManager /></Suspense>;
}
