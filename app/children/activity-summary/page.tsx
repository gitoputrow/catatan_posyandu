import type { Metadata } from "next";
import { Suspense } from "react";

import { ActivitySummaryManager } from "@/components/children/activity-summary-manager";

export const metadata: Metadata = {
  title: "Aktivitas Balita | CatatanPosyandu",
};

export default function ActivitySummaryPage() {
  return (
    <Suspense fallback={null}>
      <ActivitySummaryManager />
    </Suspense>
  );
}
