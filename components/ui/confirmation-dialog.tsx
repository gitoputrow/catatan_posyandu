"use client";

import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ConfirmationDialogProps = {
  confirmLabel: string;
  description: ReactNode;
  isLoading?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmationDialog({ confirmLabel, description, isLoading = false, isOpen, onCancel, onConfirm, title }: ConfirmationDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) onCancel();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isLoading, isOpen, onCancel]);

  if (!isOpen) return null;
  return <div aria-modal="true" className="fixed inset-0 z-[70] grid place-items-center bg-text-primary/45 p-4" role="dialog"><div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-lg"><div className="px-6 py-5"><div className="grid size-11 place-items-center rounded-full bg-warning/10 text-warning"><svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.6L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.6a2 2 0 00-3.4 0z" /></svg></div><h2 className="mt-4 text-lg font-extrabold text-text-primary">{title}</h2><div className="mt-2 text-sm leading-6 text-text-secondary">{description}</div></div><div className="flex justify-end gap-3 border-t border-border bg-background px-6 py-4"><Button disabled={isLoading} onClick={onCancel} variant="outline">Batal</Button><Button isLoading={isLoading} onClick={onConfirm}>{confirmLabel}</Button></div></div></div>;
}
