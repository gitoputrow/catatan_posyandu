export type ChildActivitySummary = {
  ageGroups: {
    infantFemale: number;
    infantMale: number;
    childFemale: number;
    childMale: number;
  };
  existingChildren: number;
  generatedAt: string;
  month: number;
  monthlyRegistrations: Array<{ count: number; month: number }>;
  newChildren: number;
  totalChildren: number;
  year: number;
};
