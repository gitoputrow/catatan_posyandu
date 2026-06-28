import type { Metadata } from "next";
import { Suspense } from "react";

import { ChildrenManager } from "@/components/children/children-manager";
import { PageLoading } from "@/components/ui/page-loading";

export const metadata: Metadata = {
  title: "Data Balita | CatatanPosyandu",
};

export default function ChildrenPage() {
  return <Suspense fallback={<PageLoading />}><ChildrenManager /></Suspense>;
}
