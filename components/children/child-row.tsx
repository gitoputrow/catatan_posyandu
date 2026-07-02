"use client";

import { useRouter } from "next/navigation";

import type { Child } from "@/components/children/types";

type ChildRowProps = {
  child: Child;
  onDelete: (child: Child) => void;
  onEdit: (child: Child) => void;
  readOnly?: boolean;
  referenceDate: Date;
};

export function ChildRow({ child, onDelete, onEdit, readOnly = false, referenceDate }: ChildRowProps) {
  const router = useRouter();

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
        {child.nama_anak}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-text-secondary">
        {child.nik_anak}
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
            className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(child);
            }}
            type="button"
          >
            <EditIcon />
          </button>
          <button
            aria-label={`Hapus ${child.nama_anak}`}
            className="rounded-lg p-1.5 text-error transition hover:bg-error/10"
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
