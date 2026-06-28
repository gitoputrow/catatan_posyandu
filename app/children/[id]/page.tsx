"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ChildDetail } from "@/components/children/child-detail";
import type { Child } from "@/components/children/types";
import { getChildById } from "@/lib/children/api";

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<Child | null | undefined>(undefined);

  useEffect(() => {
    void getChildById(id).then(setChild).catch(() => setChild(null));
  }, [id]);

  if (child === undefined) {
    return <main className="min-h-screen bg-background" />;
  }

  if (!child) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 text-center">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary">
            Data balita tidak ditemukan
          </h1>
          <Link className="mt-3 inline-block text-sm font-bold text-primary" href="/children">
            Kembali ke Data Balita
          </Link>
        </div>
      </main>
    );
  }

  return <ChildDetail initialChild={child} />;
}
