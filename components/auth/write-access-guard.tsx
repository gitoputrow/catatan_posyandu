"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { PageLoading } from "@/components/ui/page-loading";
import { useCurrentUser } from "@/components/user/user-provider";

export function WriteAccessGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { canManage, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !canManage) router.replace("/dashboard");
  }, [canManage, isLoading, router]);

  if (isLoading || !canManage) return <PageLoading />;
  return <>{children}</>;
}
