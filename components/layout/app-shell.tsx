"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { UserProvider } from "@/components/user/user-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/" || pathname.startsWith("/login");
  const isChildDetailPage = /^\/children\/[^/]+$/.test(pathname) && pathname !== "/children/create";

  if (isPublicPage) return <>{children}</>;

  if (isChildDetailPage) {
    return <UserProvider>{children}</UserProvider>;
  }

  return (
    <UserProvider>
      <div className="flex min-h-screen flex-col bg-background lg:flex-row">
        <DashboardSidebar />
        <div className="min-w-0 flex-1 pt-16 lg:pt-0">{children}</div>
      </div>
    </UserProvider>
  );
}
