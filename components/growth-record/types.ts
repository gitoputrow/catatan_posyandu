export type GrowthRecordModel = {
  id: string;

  balita_id: string;
  posyandu_id: string | null;

  periode_bulan: string;
  tanggal_pengukuran: string | null;

  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;

  catatan: string | null;

  created_at: string;
  updated_at: string;
}

export type Gender = "L" | "P";

export interface GrowthRecordViewModel {
  // Null berarti balita belum memiliki catatan pengukuran pada bulan pilihan.
  id: string | null;

  balita_id: string;
  posyandu_id: string | null;

  nama: string;
  jenis_kelamin: Gender;
  tanggal_lahir: string;
  nik_anak: string | null;

  nama_ayah: string | null;
  nama_ibu: string | null;
  nik_ortu: string | null;
  alamat: string | null;

  periode_bulan: string | null;
  tanggal_pengukuran: string | null;

  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;

  catatan: string | null;

  created_at: string | null;
  updated_at: string | null;
}
