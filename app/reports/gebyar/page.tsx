import type { Metadata } from "next";
import { Suspense } from "react";

import { GebyarReportManager } from "@/components/reports/gebyar/gebyar-report-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Gebyar Bulanan | CatatanPosyandu",
};

export default function GebyarReportPage() {
  return <Suspense fallback={<PageLoading />}><GebyarReportManager /></Suspense>;
}
