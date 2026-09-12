"use client";

import { useRouter } from "next/navigation";

import type { Child } from "@/components/children/types";
import { sensitiveValue } from "@/lib/privacy";

type ChildRowProps = {
  child: Child;
  onDelete: (child: Child) => void;
  onEdit: (child: Child) => void;
  onToggleStatus: (child: Child) => void;
  readOnly?: boolean;
  referenceDate: Date;
  showSensitiveData?: boolean;
};

export function ChildRow({ child, onDelete, onEdit, onToggleStatus, readOnly = false, referenceDate, showSensitiveData = true }: ChildRowProps) {
  const router = useRouter();
  const isInactive = Boolean(child.inactive_at);

  return (
    <tr
      className="group cursor-pointer border-l-2 border-transparent transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
      onClick={() => router.push(`/children/${child.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/children/${child.id}`);
        }
      }}
      tabIndex={0}
    >
      <td className="px-3 py-3 text-sm font-bold text-text-primary">
        <span className="block">{child.nama_anak}</span>
        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${isInactive ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>{isInactive ? "Nonaktif" : "Aktif"}</span>
      </td>
      <td className="px-3 py-3 font-mono text-xs text-text-secondary">
        {sensitiveValue(child.nik_anak, showSensitiveData)}
      </td>
      <td className="px-3 py-3 text-xs text-text-primary">
        {child.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}
      </td>
      <td className="px-3 py-3 text-xs font-medium text-text-primary">
        {getAge(child.tanggal_lahir, referenceDate)}
      </td>
      <td className="px-3 py-3 text-xs text-text-secondary">{child.rt}</td>
      <td className="px-3 py-3 text-xs text-text-secondary">{child.rw}</td>
      <td className="px-3 py-3">
        {!readOnly && <div className="flex justify-end gap-1">
          <button
            aria-label={`Edit ${child.nama_anak}`}
            className="cursor-pointer rounded-lg p-1.5 text-primary transition hover:bg-primary/10"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(child);
            }}
            type="button"
          >
            <EditIcon />
          </button>
          <button
            aria-label={`${isInactive ? "Aktifkan kembali" : "Nonaktifkan"} ${child.nama_anak}`}
            className={`cursor-pointer rounded-lg p-1.5 transition ${isInactive ? "text-primary hover:bg-primary/10" : "text-warning hover:bg-warning/10"}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleStatus(child);
            }}
            type="button"
          >
            <StatusIcon isInactive={isInactive} />
          </button>
          <button
            aria-label={`Hapus ${child.nama_anak}`}
            className="cursor-pointer rounded-lg p-1.5 text-error transition hover:bg-error/10"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(child);
            }}
            type="button"
          >
            <TrashIcon />
          </button>
        </div>}
      </td>
    </tr>
  );
}

function StatusIcon({ isInactive }: { isInactive: boolean }) {
  return isInactive
    ? <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M20 11a8 8 0 11-2.3-5.7M20 4v7h-7" /></svg>
    : <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8.5 8.5l7 7" /></svg>;
}

function getAge(birthDate: string | null | undefined, referenceDate: Date) {
  if (!birthDate) return null;

  const start = new Date(birthDate);
  if (Number.isNaN(start.getTime())) return null;

  const months =
    (referenceDate.getFullYear() - start.getFullYear()) * 12 +
    referenceDate.getMonth() -
    start.getMonth() -
    (referenceDate.getDate() < start.getDate() ? 1 : 0);

  return `${Math.max(0, months)} bln`;
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 20h4l11-11a2.8 2.8 0 00-4-4L4 16zM13.5 6.5l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" />
    </svg>
  );
}
