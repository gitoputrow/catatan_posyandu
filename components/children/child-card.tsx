"use client";

import type { Child } from "@/components/children/types";
import { sensitiveValue } from "@/lib/privacy";

type ChildCardProps = {
  child: Child;
  onDelete: (child: Child) => void;
  onEdit: (child: Child) => void;
  onOpen: () => void;
  onToggleStatus: (child: Child) => void;
  readOnly?: boolean;
  referenceDate: Date;
  showSensitiveData?: boolean;
};

export function ChildCard({ child, onDelete, onEdit, onOpen, onToggleStatus, readOnly = false, referenceDate, showSensitiveData = true }: ChildCardProps) {
  const isInactive = Boolean(child.inactive_at);

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
          <StatusBadge isInactive={isInactive} />
          <p className="mt-1 break-all font-mono text-xs text-text-secondary">{sensitiveValue(child.nik_anak, showSensitiveData)}</p>
        </div>
        {!readOnly && <div className="flex shrink-0 justify-end gap-1">
          <button aria-label={`Edit ${child.nama_anak}`} className="cursor-pointer rounded-lg p-1.5 text-primary transition hover:bg-primary/10" onClick={(event) => { event.stopPropagation(); onEdit(child); }} type="button"><EditIcon /></button>
          <button aria-label={`${isInactive ? "Aktifkan kembali" : "Nonaktifkan"} ${child.nama_anak}`} className={`cursor-pointer rounded-lg p-1.5 transition ${isInactive ? "text-primary hover:bg-primary/10" : "text-warning hover:bg-warning/10"}`} onClick={(event) => { event.stopPropagation(); onToggleStatus(child); }} type="button"><StatusIcon isInactive={isInactive} /></button>
          <button aria-label={`Hapus ${child.nama_anak}`} className="cursor-pointer rounded-lg p-1.5 text-error transition hover:bg-error/10" onClick={(event) => { event.stopPropagation(); onDelete(child); }} type="button"><TrashIcon /></button>
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

function StatusBadge({ isInactive }: { isInactive: boolean }) {
  return <span className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${isInactive ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>{isInactive ? "Nonaktif" : "Aktif"}</span>;
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

function StatusIcon({ isInactive }: { isInactive: boolean }) {
  return isInactive
    ? <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 11a8 8 0 11-2.3-5.7M20 4v7h-7" /></svg>
    : <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.5 8.5l7 7" /></svg>;
}
