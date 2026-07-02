"use client";

import type { Child } from "@/components/children/types";

type ChildCardProps = {
  child: Child;
  onDelete: (child: Child) => void;
  onEdit: (child: Child) => void;
  onOpen: () => void;
  readOnly?: boolean;
  referenceDate: Date;
};

export function ChildCard({ child, onDelete, onEdit, onOpen, readOnly = false, referenceDate }: ChildCardProps) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-primary/5" role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-extrabold leading-snug text-text-primary">{child.nama_anak}</h3>
          <p className="mt-1 break-all font-mono text-xs text-text-secondary">{child.nik_anak || "-"}</p>
        </div>
        {!readOnly && <div className="flex shrink-0 justify-end gap-1">
          <button aria-label={`Edit ${child.nama_anak}`} className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10" onClick={(event) => { event.stopPropagation(); onEdit(child); }} type="button"><EditIcon /></button>
          <button aria-label={`Hapus ${child.nama_anak}`} className="rounded-lg p-1.5 text-error transition hover:bg-error/10" onClick={(event) => { event.stopPropagation(); onDelete(child); }} type="button"><TrashIcon /></button>
        </div>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <InfoCard label="Jenis kelamin" value={child.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"} />
        <InfoCard label="Usia" value={getAge(child.tanggal_lahir, referenceDate) || "-"} />
        <InfoCard label="RT" value={child.rt || "-"} />
        <InfoCard label="RW" value={child.rw || "-"} />
      </div>
      {(child.nama_posyandu || child.nama_kelurahan) && <p className="mt-3 text-[10px] font-medium text-text-secondary">{[child.nama_posyandu, child.nama_kelurahan].filter(Boolean).join(" · ")}</p>}
    </article>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-background py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">{label}</p><p className="mt-1 text-xs font-extrabold text-text-primary">{value}</p></div>;
}

function getAge(birthDate: string | null | undefined, referenceDate: Date) {
  if (!birthDate) return null;
  const start = new Date(birthDate);
  if (Number.isNaN(start.getTime())) return null;
  const months = (referenceDate.getFullYear() - start.getFullYear()) * 12 + referenceDate.getMonth() - start.getMonth() - (referenceDate.getDate() < start.getDate() ? 1 : 0);
  return `${Math.max(0, months)} bln`;
}

function EditIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 20h4l11-11a2.8 2.8 0 00-4-4L4 16zM13.5 6.5l4 4" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" /></svg>;
}
