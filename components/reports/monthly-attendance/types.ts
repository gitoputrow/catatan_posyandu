export type MonthlyAttendanceRow = {
  ageGroup: "0-12-months" | "1-5-years";
  ageLabel: string;
  gender: "L" | "P";
  genderLabel: string;
  newChildren: number;
  existingChildren: number;
  total: number;
};

export type MonthlyAttendanceReport = {
  month: number;
  year: number;
  totalAttended: number;
  totalNew: number;
  totalExisting: number;
  unclassified: number;
  rows: MonthlyAttendanceRow[];
  information: MonthlyPosyanduInformation;
  savedReport: SavedMonthlyAttendanceReport | null;
};

export type SavedMonthlyAttendanceReport = {
  id: string;
  periode: string;
  total_pus: number;
  total_wus: number;
  total_ibu_hamil: number;
  total_ibu_menyusui: number;
  total_pria_plkb: number;
  total_wanita_plkb: number;
  total_pria_medis: number;
  total_wanita_medis: number;
  total_balita_meninggal: number;
  total_balita_lahir: number;
  id_petugas: string[];
};

export type MonthlyPosyanduInformation = {
  totalPus: number;
  totalWus: number;
  totalPregnantWomen: number;
  totalBreastfeedingMothers: number;
  totalMaleCadres: number;
  totalFemaleCadres: number;
  totalMalePlkb: number;
  totalFemalePlkb: number;
  totalMaleMedicalStaff: number;
  totalFemaleMedicalStaff: number;
  totalChildrenBorn: number;
  totalChildrenDied: number;
};
