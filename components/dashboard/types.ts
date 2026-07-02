export type DashboardData = {
  year: number;
  generatedAt: string;
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
