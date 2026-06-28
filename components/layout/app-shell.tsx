"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname.startsWith("/login");
  const isChildDetailPage = /^\/children\/[^/]+$/.test(pathname) && pathname !== "/children/create";

  if (isPublicPage || isChildDetailPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <DashboardSidebar />
      <div className="min-w-0 flex-1 pt-16 lg:pt-0">{children}</div>
    </div>
  );
}
