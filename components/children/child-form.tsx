"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { Child, Kelurahan, Posyandu } from "@/components/children/types";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormSelect } from "@/components/ui/form";
import { getKelurahan, getPosyandu } from "@/lib/children/api";

const emptyChild: Omit<Child, "id" | "created_at" | "registered_at" | "updated_at"> = {
  alamat: "",
  hp_ortu: "",
  jenis_kelamin: "L",
  kelurahan_id: "",
  nama_anak: "",
  nama_ayah: "",
  nama_ibu: "",
  nama_kelurahan: "",
  nama_posyandu: "",
  nik_anak: "",
  nik_ortu: "",
  no_hp_ayah: "",
  no_hp_ibu: "",
  no_urut_anak: 1,
  nomor_kk: "",
  posyandu_id: "",
  rt: "",
  rw: "",
  tanggal_lahir: "",
};

export function ChildForm({
  child,
  onClose,
  onSave,
  presentation = "modal",
}: {
  child: Child | null;
  onClose: () => void;
  onSave: (child: Child) => void | Promise<void>;
  presentation?: "modal" | "page";
}) {
  const [formData, setFormData] = useState(() => normalizeFormData(child));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kelurahan, setKelurahan] = useState<Kelurahan[]>([]);
  const [posyandu, setPosyandu] = useState<Posyandu[]>([]);
  const [isReferenceLoading, setIsReferenceLoading] = useState(true);
  const isEditing = child !== null;

  useEffect(() => {
    let isMounted = true;
    void Promise.all([getKelurahan(), getPosyandu()])
      .then(([kelurahanData, posyanduData]) => {
        if (!isMounted) return;
        setKelurahan(kelurahanData);
        setPosyandu(posyanduData);
      })
      .catch((loadError) => {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : "Data kelurahan dan Posyandu gagal dimuat.");
      })
      .finally(() => {
        if (isMounted) setIsReferenceLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const availablePosyandu = useMemo(
    () => posyandu.filter((item) => item.kelurahan_id === formData.kelurahan_id),
    [formData.kelurahan_id, posyandu],
  );

  function updateField(name: string, value: string) {
    setFormData((current) => ({
      ...current,
      [name]: name === "no_urut_anak" ? Number(value) : value,
    }));
  }

  function selectKelurahan(id: string) {
    const selected = kelurahan.find((item) => item.id === id);
    setFormData((current) => ({
      ...current,
      kelurahan_id: selected?.id ?? "",
      nama_kelurahan: selected?.nama_kelurahan ?? "",
      nama_posyandu: "",
      posyandu_id: "",
    }));
  }

  function selectPosyandu(id: string) {
    const selected = availablePosyandu.find((item) => item.id === id);
    setFormData((current) => ({
      ...current,
      nama_posyandu: selected?.nama_posyandu ?? "",
      posyandu_id: selected?.id ?? "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const now = new Date().toISOString();
    try {
      await onSave({
        ...formData,
        id: child?.id ?? crypto.randomUUID(),
        created_at: child?.created_at ?? now,
        registered_at: child?.registered_at ?? now,
        updated_at: now,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Data balita gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      aria-modal={presentation === "modal" ? "true" : undefined}
      className={presentation === "modal" ? "fixed inset-0 z-50 grid place-items-center bg-text-primary/45 p-4" : "px-5 py-6 sm:px-8 sm:py-8 lg:px-10"}
      role={presentation === "modal" ? "dialog" : undefined}
    >
      <Form
        className={presentation === "modal" ? "max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface shadow-lg" : "mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface"}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            {presentation === "page" && (
              <p className="text-sm font-semibold text-primary">MANAJEMEN DATA</p>
            )}
            <h2 className="text-xl font-extrabold text-text-primary">
              {isEditing ? "Edit Data Balita" : "Tambah Data Balita"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Lengkapi data utama balita dan orang tua/wali.
            </p>
          </div>
          {presentation === "modal" && (
            <button
              aria-label="Tutup form"
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-text-secondary hover:bg-background"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          )}
        </div>
        {error && <p className="px-6 pt-4 text-sm font-medium text-error">{error}</p>}
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <FormField
            label="Nama anak"
            name="nama_anak"
            onValueChange={updateField}
            value={formData.nama_anak}
          />
          <FormField
            label="NIK anak"
            name="nik_anak"
            onValueChange={updateField}
            required
            value={formData.nik_anak}
          />
          <FormField
            label="Tanggal lahir"
            name="tanggal_lahir"
            onValueChange={updateField}
            type="date"
            value={formData.tanggal_lahir}
          />
          <FormSelect label="Jenis kelamin" name="jenis_kelamin" onChange={(event) => updateField("jenis_kelamin", event.target.value)} value={formData.jenis_kelamin}>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </FormSelect>
          <FormField
            label="Nama ibu"
            name="nama_ibu"
            onValueChange={updateField}
            value={formData.nama_ibu}
          />
          <FormField
            label="Nama ayah"
            name="nama_ayah"
            onValueChange={updateField}
            value={formData.nama_ayah}
          />
          <FormField
            label="No. HP orang tua"
            name="hp_ortu"
            onValueChange={updateField}
            type="tel"
            value={formData.hp_ortu}
          />
          <FormSelect disabled={isReferenceLoading} label="Kelurahan" onChange={(event) => selectKelurahan(event.target.value)} value={formData.kelurahan_id}>
            {
              isReferenceLoading && <option value="">Memuat kelurahan...</option>
            }
            {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.nama_kelurahan}</option>)}
          </FormSelect>
          <FormSelect disabled={isReferenceLoading || !formData.kelurahan_id} label="Posyandu" onChange={(event) => selectPosyandu(event.target.value)} value={formData.posyandu_id}>
            {
              isReferenceLoading || formData.kelurahan_id === "" && <option value="">{formData.kelurahan_id === "" ? "Pilih kelurahan terlebih dahulu" : "Memuat posyandu..."}</option>
            }
            {availablePosyandu.map((item) => <option key={item.id} value={item.id}>{item.nama_posyandu}</option>)}
          </FormSelect>
          <FormField
            label="Alamat"
            name="alamat"
            onValueChange={updateField}
            value={formData.alamat}
          />
          <FormField
            label="RT"
            name="rt"
            onValueChange={updateField}
            value={formData.rt}
          />
          <FormField
            label="RW"
            name="rw"
            onValueChange={updateField}
            value={formData.rw}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <Button disabled={isSaving} onClick={onClose} type="button" variant="outline">
            Batal
          </Button>
          <Button isLoading={isSaving} type="submit">
            {isEditing ? "Simpan Perubahan" : "Simpan Data Balita"}
          </Button>
        </div>
      </Form>
    </div>
  );
}


function normalizeFormData(child: Child | null): Omit<Child, "id" | "created_at" | "registered_at" | "updated_at"> {
  if (!child) return emptyChild;

  return {
    alamat: child.alamat ?? "",
    hp_ortu: child.hp_ortu ?? "",
    jenis_kelamin: child.jenis_kelamin ?? "L",
    kelurahan_id: child.kelurahan_id ?? "",
    nama_anak: child.nama_anak ?? "",
    nama_ayah: child.nama_ayah ?? "",
    nama_ibu: child.nama_ibu ?? "",
    nama_kelurahan: child.nama_kelurahan ?? "",
    nama_posyandu: child.nama_posyandu ?? "",
    nik_anak: child.nik_anak ?? "",
    nik_ortu: child.nik_ortu ?? "",
    no_hp_ayah: child.no_hp_ayah ?? "",
    no_hp_ibu: child.no_hp_ibu ?? "",
    no_urut_anak: child.no_urut_anak ?? 1,
    nomor_kk: child.nomor_kk ?? "",
    posyandu_id: child.posyandu_id ?? "",
    rt: child.rt ?? "",
    rw: child.rw ?? "",
    tanggal_lahir: child.tanggal_lahir ?? "",
  };
}
