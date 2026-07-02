import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateChildPage } from "@/components/children/create-child-page";
import { WriteAccessGuard } from "@/components/auth/write-access-guard";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Tambah Balita | CatatanPosyandu",
};

export default function CreateChildRoute() {
  return <WriteAccessGuard><Suspense fallback={<PageLoading />}><CreateChildPage /></Suspense></WriteAccessGuard>;
}
