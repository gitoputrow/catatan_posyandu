import type { Metadata } from "next";
import { Suspense } from "react";

import { CreateChildPage } from "@/components/children/create-child-page";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Tambah Balita | CatatanPosyandu",
};

export default function CreateChildRoute() {
  return <Suspense fallback={<PageLoading />}><CreateChildPage /></Suspense>;
}
