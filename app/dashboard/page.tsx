import type { Metadata } from "next";

import { DashboardManager } from "@/components/dashboard/dashboard-manager";

export const metadata: Metadata = {
  title: "Dashboard Posyandu | CatatanPosyandu",
};

export default function DashboardPage() {
  return <DashboardManager />;
}
