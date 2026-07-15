export type Child = {
  id: string;
  alamat: string;
  hp_ortu: string;
  jenis_kelamin: "L" | "P";
  kelurahan_id: string;
  nama_anak: string;
  nama_ayah: string;
  nama_ibu: string;
  nama_kelurahan: string;
  nama_posyandu: string;
  nik_anak: string;
  nik_ortu: string;
  no_hp_ayah: string;
  no_hp_ibu: string;
  no_urut_anak: number;
  nomor_kk: string;
  posyandu_id: string;
  rt: string;
  rw: string;
  tanggal_lahir: string;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  registered_at: string | null;
  updated_at: string;
};

export type Kelurahan = {
  id: string;
  nama_kelurahan: string;
};

export type Posyandu = {
  id: string;
  kelurahan_id: string;
  nama_posyandu: string;
};
