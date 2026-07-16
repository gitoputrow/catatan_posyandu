import type { Metadata } from "next";

import { DashboardManager } from "@/components/dashboard/dashboard-manager";

export const metadata: Metadata = {
  title: "Ringkasan Aktivitas | CatatanPosyandu",
};

export default function DashboardPage() {
  return <DashboardManager />;
}
