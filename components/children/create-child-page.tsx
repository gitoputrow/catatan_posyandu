"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ChildForm } from "@/components/children/child-form";
import type { Child } from "@/components/children/types";
import { createChild } from "@/lib/children/api";

export function CreateChildPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  const fallbackPath = redirectPath ?? "/children";

  async function saveChild(child: Child) {
    const payload = Object.fromEntries(
      Object.entries(child).filter(
        ([key]) => !["id", "created_by", "created_by_name", "created_at", "registered_at", "updated_at"].includes(key),
      ),
    ) as Omit<Child, "id" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at">;

    await createChild(payload);
    router.push(fallbackPath);
    router.refresh();
  }

  return <ChildForm backHref={fallbackPath} child={null} onClose={() => router.push(fallbackPath)} onSave={saveChild} presentation="page" />;
}

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
