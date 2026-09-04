export type WorkoutPlanSummary = {
  id: string;
  title: string;
  exercises: number;
  minutes: number;
};

export type DietPlanSummary = {
  id: string;
  title: string;
  meals: number;
  calories: number;
};

export const dummyWorkoutPlans: WorkoutPlanSummary[] = [
  { id: 'w1', title: 'Full Body Strength', exercises: 5, minutes: 45 },
  { id: 'w2', title: 'Upper Body Push', exercises: 4, minutes: 30 },
  { id: 'w3', title: 'Leg Day', exercises: 6, minutes: 50 },
];

export const dummyDietPlans: DietPlanSummary[] = [
  { id: 'd1', title: 'Lean Bulk Meal Plan', meals: 4, calories: 2400 },
  { id: 'd2', title: 'Cutting Plan', meals: 3, calories: 1800 },
  { id: 'd3', title: 'Maintenance Plan', meals: 4, calories: 2100 },
];

export const dummyExploreWorkoutPlans: WorkoutPlanSummary[] = [
  { id: 'ew1', title: 'Beginner Full Body', exercises: 5, minutes: 40 },
  { id: 'ew2', title: '5x5 Strength Program', exercises: 5, minutes: 60 },
  { id: 'ew3', title: 'HIIT Cardio Blast', exercises: 8, minutes: 25 },
];

export const dummyExploreDietPlans: DietPlanSummary[] = [
  { id: 'ed1', title: 'Balanced Macros Plan', meals: 4, calories: 2000 },
  { id: 'ed2', title: 'Keto Starter Plan', meals: 3, calories: 1700 },
  { id: 'ed3', title: 'High Protein Plan', meals: 5, calories: 2500 },
];
