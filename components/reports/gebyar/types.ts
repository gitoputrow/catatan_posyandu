export type GebyarPosyanduIdentity = {
  address: string;
  cityOrRegency: string | null;
  districtName: string | null;
  presentCadres: number;
  posyanduName: string;
  totalCadres: number;
  villageName: string | null;
};

export type SavedGebyarReport = {
  id: string;
  periode: string;
  total_pus_binaan: number | null;
  total_kb_binaan: number | null;
  total_kb_dilayani: number | null;
  pemberian_tambahan_makanan: boolean | null;
  program_tambahan_total_ppks: number | null;
  program_tambahan_total_bkb: number | null;
  program_tambahan_total_paud: number | null;
  program_tambahan_total_gsi: number | null;
  program_tambahan_total_psn: number | null;
  program_tambahan_total_lainnya: number | null;
  mitra_total_perusahaan: number | null;
  mitra_total_bumn_bumd: number | null;
  mitra_total_kantor_dinas: number | null;
  mitra_total_lsm_lsom: number | null;
  dana_sehat_total_keluarga_sasaran: number | null;
  dana_sehat_total_sumbangan: number | null;
};

export type GebyarReport = {
  cadres: Array<{
    id: string;
    name: string;
  }>;
  savedReport: SavedGebyarReport | null;
  additionalPrograms: {
    bkb: number | null;
    elderlyDevelopment: number | null;
    gsi: number | null;
    other: number | null;
    paud: number | null;
    ppks: number | null;
    psn: number | null;
  };
  involvedPartners: {
    bumnOrBumd: number | null;
    company: number | null;
    governmentOffice: number | null;
    lsmOrLsom: number | null;
  };
  healthyFund: {
    contributingFamilies: number | null;
    targetFamilies: number | null;
    total: number | null;
  };
  supplementaryFeeding: boolean | null;
  familyPlanning: {
    coachedCouplesOfReproductiveAge: number | null;
    coachedParticipants: number | null;
    servedParticipants: {
      condom: number;
      implant: number;
      injection: number;
      iud: number;
      pill: number;
      sterilization: number;
      total: number;
    } | null;
  };
  healthOfMotherAndChild: {
    pregnantWomenExamined: number | null;
    totalPregnantWomen: number;
    vitaminAProvided: boolean | null;
  };
  immunization: {
    bcg: number | null;
    campak: number | null;
    dpt1: number | null;
    dpt2: number | null;
    dpt3: number | null;
    hepatitis1: number | null;
    hepatitis2: number | null;
    hepatitis3: number | null;
    polio1: number | null;
    polio2: number | null;
    polio3: number | null;
    polio4: number | null;
    pregnantWomenTt1: number | null;
    pregnantWomenTt2: number | null;
  };
  nutrition: {
    belowRedLine: number | null;
    firstWeighing: number;
    hasKms: number | null;
    notWeighedLastMonth: number;
    totalChildren: number;
    weighedChildren: number;
    weightNotUp: number;
    weightUp: number;
  };
  diarrheaPrevention: {
    childrenGivenOralit: number | null;
    childrenSuspectedDiarrhea: number | null;
  };
  identity: GebyarPosyanduIdentity;
  month: number;
  year: number;
};
