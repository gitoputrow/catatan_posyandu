export type GrowthHistoryChild = {
  id: string;
  nama: string;
  jenis_kelamin: "L" | "P";
  tanggal_lahir: string | null;
  nik_anak: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  nik_ortu: string | null;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  nama_posyandu: string | null;
  nama_kelurahan: string | null;
};

export type GrowthHistoryMeasurement = {
  balita_id: string;
  periode_bulan: string;
  berat_badan: number | null;
  tinggi_badan: number | null;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
};

export type GrowthHistoryResponse = {
  children: GrowthHistoryChild[];
  selectedChildId: string | null;
  measurements: GrowthHistoryMeasurement[];
};
