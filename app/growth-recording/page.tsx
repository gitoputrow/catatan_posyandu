import type { Metadata } from "next";
import { Suspense } from "react";

import { GrowthRecordManager } from "@/components/growth-record/growth-record-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Pencatatan Pertumbuhan | CatatanPosyandu",
};

export default function GrowthRecordingPage() {
  return <Suspense fallback={<PageLoading />}><GrowthRecordManager /></Suspense>;
}
