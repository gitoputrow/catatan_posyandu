export type DashboardData = {
  year: number;
  generatedAt: string;
  posyandu: {
    name: string | null;
    rt: string | null;
    rw: string | null;
    village: string | null;
    district: string | null;
    cadreCount: number;
  };
  totalChildren: number;
  ageGroups: {
    infantMale: number;
    infantFemale: number;
    childMale: number;
    childFemale: number;
  };
  growthTrends: {
    weightUp: number;
    weightDown: number;
    heightUp: number;
    weightUpChange: number;
    weightDownChange: number;
    heightUpChange: number;
  };
  growthTrendPeriod: string | null;
  monthlyWeighings: Array<{
    month: number;
    count: number;
  }>;
};
