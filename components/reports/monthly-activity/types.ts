export type MonthlyActivityReport = {
  id: string;
  periode: string;
  posyandu_id: string;
  created_by: string | null;
  created_by_name?: string | null;

  total_kb_kondom: number | null;
  total_kb_pil: number | null;
  total_kb_implant: number | null;
  total_kb_mop: number | null;
  total_kb_mow: number | null;
  total_kb_iud: number | null;
  total_kb_suntik: number | null;
  total_kb_lainnya: number | null;

  fe_tab_tablet_besi: boolean | null;
  balita_kmsk: boolean | null;
  dapat_vit_a: boolean | null;
  dapat_pmt: boolean | null;
  imunisasi_tt_1: boolean | null;
  imunisasi_tt_2: boolean | null;
  periksa_bumil: boolean | null;

  total_bcg_l: number | null;
  total_bcg_p: number | null;

  total_dpt_1_l: number | null;
  total_dpt_1_p: number | null;
  total_dpt_2_l: number | null;
  total_dpt_2_p: number | null;
  total_dpt_3_l: number | null;
  total_dpt_3_p: number | null;

  total_polio_1_l: number | null;
  total_polio_1_p: number | null;
  total_polio_2_l: number | null;
  total_polio_2_p: number | null;
  total_polio_3_l: number | null;
  total_polio_3_p: number | null;
  total_polio_4_l: number | null;
  total_polio_4_p: number | null;

  total_hepatitis_b_1_l: number | null;
  total_hepatitis_b_1_p: number | null;
  total_hepatitis_b_2_l: number | null;
  total_hepatitis_b_2_p: number | null;
  total_hepatitis_b_3_l: number | null;
  total_hepatitis_b_3_p: number | null;

  total_campak_l: number | null;
  total_campak_p: number | null;

  total_balita_diare_l: number | null;
  total_balita_diare_p: number | null;

  total_oralit_l: number | null;
  total_oralit_p: number | null;

  created_at: string;
  updated_at: string;
  keterangan: string | null;
};

export type MonthlyActivityGenderCount = {
  male: number;
  female: number;
  total: number;
};

export type MonthlyActivityWeighingSummary = {
  activeChildren: MonthlyActivityGenderCount;
  kmsK: MonthlyActivityGenderCount | null;
  weighedChildren: MonthlyActivityGenderCount;
  weightUp: MonthlyActivityGenderCount;
  vitaminA: MonthlyActivityGenderCount | null;
  pmt: MonthlyActivityGenderCount | null;
};

export type MonthlyActivityOverview = {
  month: number;
  year: number;
  totalPregnantWomen: number;
  totalBreastfeedingMothers: number;
  weighingSummary: MonthlyActivityWeighingSummary;
  savedReport: MonthlyActivityReport | null;
};
