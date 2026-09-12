"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { Child } from "@/components/children/types";
import { Button } from "@/components/ui/button";
import { FormField, FormTextarea } from "@/components/ui/form";

export function ChildStatusDialog({
  child,
  onClose,
  onDeactivate,
  onReactivate,
}: {
  child: Child | null;
  onClose: () => void;
  onDeactivate: (inactiveAt: string, inactiveReason: string) => Promise<void>;
  onReactivate: () => Promise<void>;
}) {
  const [inactiveAt, setInactiveAt] = useState(() => getTodayInputValue());
  const [inactiveReason, setInactiveReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!child) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [child, isSaving, onClose]);

  if (!child) return null;

  const isInactive = Boolean(child.inactive_at);

  async function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isInactive && !inactiveAt) {
      setError("Tanggal mulai nonaktif wajib diisi.");
      return;
    }
    if (!isInactive && !inactiveReason.trim()) {
      setError("Alasan menonaktifkan balita wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      if (isInactive) await onReactivate();
      else await onDeactivate(inactiveAt, inactiveReason.trim());
      onClose();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Status balita gagal diperbarui.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-text-primary/45 p-3 sm:p-4" role="dialog">
      <form className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-lg sm:max-h-[calc(100dvh-2rem)]" onSubmit={submitStatus}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-semibold text-primary">STATUS BALITA</p>
            <h2 className="mt-1 text-xl font-extrabold text-text-primary">
              {isInactive ? "Aktifkan Kembali Balita" : "Nonaktifkan Balita"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{child.nama_anak}</p>
          </div>
          <button aria-label="Tutup perubahan status balita" className="grid size-9 cursor-pointer place-items-center rounded-lg text-text-secondary transition hover:bg-background" disabled={isSaving} onClick={onClose} type="button">×</button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {isInactive ? (
            <p className="text-sm leading-6 text-text-secondary">
              Balita akan kembali muncul pada daftar periode yang berlaku dan dapat dipilih untuk pencatatan pertumbuhan.
            </p>
          ) : (
            <div className="space-y-5">
              <FormField
                label="Mulai nonaktif"
                max={getTodayInputValue()}
                name="inactive_at"
                onChange={(event) => setInactiveAt(event.target.value)}
                required
                type="date"
                value={inactiveAt}
              />
              <FormTextarea
                label="Alasan nonaktif"
                onChange={(event) => setInactiveReason(event.target.value)}
                placeholder="Tuliskan alasan balita dinonaktifkan"
                required
                value={inactiveReason}
              />
            </div>
          )}
          {error && <p className="mt-4 text-sm font-medium text-error">{error}</p>}
        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-border bg-surface px-5 py-4 sm:flex sm:justify-end sm:px-6">
          <Button disabled={isSaving} onClick={onClose} type="button" variant="outline">Batal</Button>
          <Button isLoading={isSaving} type="submit" variant={isInactive ? "primary" : "danger"}>
            {isInactive ? "Aktifkan Kembali" : "Nonaktifkan"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
