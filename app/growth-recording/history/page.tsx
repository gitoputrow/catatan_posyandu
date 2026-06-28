import type { Metadata } from "next";
import { Suspense } from "react";

import { GrowthHistoryManager } from "@/components/growth-history/growth-history-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Riwayat Pertumbuhan | CatatanPosyandu",
};

export default function GrowthHistoryPage() {
  return <Suspense fallback={<PageLoading />}><GrowthHistoryManager /></Suspense>;
}
