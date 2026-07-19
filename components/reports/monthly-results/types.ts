export type MonthlyResultsReport = {
  id: string;
  periode: string;
  posyandu_id: string;
  created_by: string;

  total_ibu_nifas: number | null;
  dapat_vit_a_merah: boolean | null;

  total_balita_diberi_asi_proses_l: number | null;
  total_balita_diberi_asi_proses_p: number | null;

  total_balita_diberi_makan_minum_l: number | null;
  total_balita_diberi_makan_minum_p: number | null;

  total_balita_timbang_tidak_terdaftar_asi_l: number | null;
  total_balita_timbang_tidak_terdaftar_asi_p: number | null;

  total_balita_asi_dapat_eksklusif_l: number | null;
  total_balita_asi_dapat_eksklusif_p: number | null;

  total_ibu_hamil_resiko_kek: number | null;
  keterangan: string | null;

  created_at: string;
  updated_at: string;
};

export type MonthlyResultsReportInput = Omit<
  MonthlyResultsReport,
  "id" | "posyandu_id" | "created_by" | "created_at" | "updated_at"
>;

export type MonthlyResultsGenderCount = {
  male: number;
  female: number;
  total: number;
};

export type MonthlyResultsNullableGenderCount = {
  male: number | null;
  female: number | null;
  total: number | null;
};

export type MonthlyResultsGroupedCount = {
  age0To5Months: MonthlyResultsGenderCount;
  age6To11Months: MonthlyResultsGenderCount;
  age12To23Months: MonthlyResultsGenderCount;
  age24To59Months: MonthlyResultsGenderCount;
  total: MonthlyResultsGenderCount;
};

export type MonthlyResultsOverview = {
  address: {
    posyanduName: string;
    rt: string | null;
    rw: string | null;
    villageName: string | null;
    districtName: string | null;
    cityName: string | null;
  };
  cadres: {
    list: Array<{ id: string; name: string }>;
    present: number;
    total: number;
  };
  pregnantAndPostpartum: {
    totalPregnantWomen: number;
    pregnantWomenReceivedIron: number | null;
    pregnantWomenAtRiskOfKek: number | null;
    totalPostpartumMothers: number | null;
    postpartumMothersReceivedRedVitaminA: number | null;
  };
  weighingActivities: {
    registeredChildren: MonthlyResultsGroupedCount;
    reachedSixMonthsThisMonth: MonthlyResultsGenderCount;
    childrenWithKms: MonthlyResultsGroupedCount;
    weighedChildren: MonthlyResultsGroupedCount;
    nutritionGuide: {
      weightUp: MonthlyResultsGroupedCount;
      weightNotUp: MonthlyResultsGroupedCount;
      notWeighedLastMonth: MonthlyResultsGroupedCount;
      firstWeighing: MonthlyResultsGroupedCount;
    };
    belowRedLine: MonthlyResultsGroupedCount;
    belowRedLineReferred: MonthlyResultsGroupedCount;
    aboveGreenLine: MonthlyResultsGroupedCount;
    aboveGreenLineReferred: MonthlyResultsGroupedCount;
    weightNotUpTwice: MonthlyResultsGroupedCount;
    weightNotUpTwiceReferred: MonthlyResultsGroupedCount;
  };
  vitaminA: {
    blueCapsuleAge6To11Months: MonthlyResultsNullableGenderCount;
    redCapsuleAge12To59Months: MonthlyResultsNullableGenderCount;
  };
  exclusiveBreastfeeding: {
    breastMilkOnlyInProcess: MonthlyResultsNullableGenderCount;
    receivedOtherFoodOrDrink: MonthlyResultsNullableGenderCount;
    weighedWithoutBreastfeedingRegistration: MonthlyResultsNullableGenderCount;
    reachedSixMonthsThisMonth: MonthlyResultsGenderCount;
    completedExclusiveBreastfeeding: MonthlyResultsNullableGenderCount;
  };
  month: number;
  year: number;
  savedReport: MonthlyResultsReport | null;
};
