import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateGrowthRecordPage } from "@/components/growth-record/create-growth-record-page";
import { WriteAccessGuard } from "@/components/auth/write-access-guard";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Tambah Catatan Pertumbuhan | CatatanPosyandu",
};

export default function CreateGrowthRecordRoute() {
  return <WriteAccessGuard><Suspense fallback={<PageLoading />}><CreateGrowthRecordPage /></Suspense></WriteAccessGuard>;
}
