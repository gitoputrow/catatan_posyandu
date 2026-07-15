"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChildForm } from "@/components/children/child-form";
import type { Child } from "@/components/children/types";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/user/user-provider";
import { removeChild, updateChild } from "@/lib/children/api";
import { sensitiveValue } from "@/lib/privacy";

export function ChildDetail({ initialChild }: { initialChild: Child }) {
  const router = useRouter();
  const { canManage } = useCurrentUser();
  const [child, setChild] = useState(initialChild);
  const [isEditing, setIsEditing] = useState(false);

  async function deleteChild() {
    if (!window.confirm(`Hapus data ${child.nama_anak}?`)) return;
    try {
      await removeChild(child.id);
      router.push("/children");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Data balita gagal dihapus.");
    }
  }

  async function saveChild(updatedChild: Child) {
    const payload = Object.fromEntries(
      Object.entries(updatedChild).filter(([key]) => !["id", "created_by", "created_by_name", "created_at", "registered_at", "updated_at"].includes(key)),
    ) as Omit<Child, "id" | "created_by" | "created_by_name" | "created_at" | "registered_at" | "updated_at">;
    const savedChild = await updateChild(updatedChild.id, payload);
    setChild(savedChild);
    setIsEditing(false);
  }

  return (
    <main className="px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
      <button className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-text-secondary transition hover:text-primary" onClick={() => router.push("/children")} type="button">
        <span aria-hidden="true">←</span>
        Kembali ke Data Balita
      </button>

      <header className="mt-5 flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-semibold text-primary">DETAIL BALITA</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">{child.nama_anak}</h1>
          <p className="mt-2 text-sm text-text-secondary">NIK Anak: {sensitiveValue(child.nik_anak, canManage)}</p>
        </div>
        {canManage && <div className="flex gap-3">
          <Button onClick={() => setIsEditing(true)} variant="outline">Edit Data</Button>
          <Button onClick={deleteChild} variant="danger">Hapus</Button>
        </div>}
      </header>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <DetailCard title="Informasi Anak">
          <DetailItem label="Nama anak" value={child.nama_anak} />
          <DetailItem label="Dibuat oleh" value={child.created_by_name ?? child.created_by ?? "-"} />
          <DetailItem label="NIK anak" value={sensitiveValue(child.nik_anak, canManage)} />
          <DetailItem label="Nomor KK" value={sensitiveValue(child.nomor_kk, canManage)} />
          <DetailItem label="Anak ke" value={String(child.no_urut_anak)} />
          {child.tanggal_lahir && <DetailItem label="Tanggal lahir" value={formatDate(child.tanggal_lahir)} />}
          <DetailItem label="Jenis kelamin" value={child.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"} />
        </DetailCard>

        <DetailCard title="Orang Tua / Wali">
          <DetailItem label="Nama ibu" value={child.nama_ibu} />
          <DetailItem label="Nama ayah" value={child.nama_ayah} />
          <DetailItem label="NIK orang tua" value={sensitiveValue(child.nik_ortu, canManage)} />
          <DetailItem label="No. HP ibu" value={sensitiveValue(child.no_hp_ibu, canManage)} />
          <DetailItem label="No. HP ayah" value={sensitiveValue(child.no_hp_ayah, canManage)} />
          <DetailItem label="No. HP utama" value={sensitiveValue(child.hp_ortu, canManage)} />
        </DetailCard>

        <DetailCard title="Kewilayahan Anak">
          <DetailItem label="Alamat" value={child.alamat} />
          <DetailItem label="RT" value={child.rt} />
          <DetailItem label="RW" value={child.rw} />
          <DetailItem label="Kelurahan" value={child.nama_kelurahan} />
          <DetailItem label="Nama Posyandu" value={child.nama_posyandu} />
        </DetailCard>
      </section>

      {canManage && isEditing && <ChildForm child={child} onClose={() => setIsEditing(false)} onSave={saveChild} />}
    </main>
  );
}

function DetailCard({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"><h2 className="border-b border-border px-5 py-4 font-bold text-text-primary">{title}</h2><dl className="divide-y divide-border px-5">{children}</dl></section>;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[minmax(120px,0.8fr)_minmax(0,1.2fr)] gap-4 py-3 text-sm"><dt className="text-text-secondary">{label}</dt><dd className="break-all font-semibold text-text-primary">{value || "-"}</dd></div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)); }
