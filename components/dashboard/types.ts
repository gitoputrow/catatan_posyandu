export type DashboardData = {
  year: number;
  generatedAt: string;
  ageGroups: {
    infantMale: number;
    infantFemale: number;
    childMale: number;
    childFemale: number;
  };
  monthlyWeighings: Array<{
    month: number;
    count: number;
  }>;
};
