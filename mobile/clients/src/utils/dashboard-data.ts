import { ComponentProps } from 'react';

import { SymbolView } from 'expo-symbols';

import {
  assignedCoach,
  assignedDietPlan,
  assignedWorkoutPlan,
  coachProfiles,
  demoClient,
} from '@/data/mock-data';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export type HomePlanCard = {
  id: 'workout' | 'diet';
  title: string;
  eyebrow: string;
  summary: string;
  metric: string;
  detail: string;
  route: '/workout' | '/diet';
  iconName: SymbolName;
  accentColor: string;
  accentBackground: string;
};

export type WorkoutSet = {
  id: string;
  setNumber: number;
  reps: string;
  weight: string;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  note: string;
  sets: WorkoutSet[];
};

export type SetFeedback = {
  completed: boolean;
  comment: string;
  videoReference: string;
};

export const todaysPlanCards: HomePlanCard[] = [
  {
    id: 'workout',
    title: "Today's workout",
    eyebrow: assignedWorkoutPlan.focus,
    summary: assignedWorkoutPlan.summary,
    metric: assignedWorkoutPlan.duration,
    detail: assignedWorkoutPlan.exercises.slice(0, 2).map((exercise) => exercise.name).join(' • '),
    route: '/workout',
    iconName: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
    accentColor: '#0F8B8D',
    accentBackground: '#E4F5F4',
  },
  {
    id: 'diet',
    title: "Today's diet",
    eyebrow: 'Balanced fuel',
    summary: assignedDietPlan.summary,
    metric: assignedDietPlan.calories,
    detail: assignedDietPlan.meals.slice(0, 2).map((meal) => meal.label).join(' • '),
    route: '/diet',
    iconName: { ios: 'fork.knife.circle', android: 'restaurant', web: 'restaurant' },
    accentColor: '#D97904',
    accentBackground: '#FFF1DF',
  },
];

export const workoutDetails: {
  title: string;
  time: string;
  focus: string;
  exercises: WorkoutExercise[];
} = {
  title: assignedWorkoutPlan.title,
  time: assignedWorkoutPlan.duration,
  focus: assignedWorkoutPlan.focus,
  exercises: assignedWorkoutPlan.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    note: exercise.note,
    sets: exercise.sets.map((set) => ({
      id: set.id,
      setNumber: set.setNumber,
      reps: set.reps,
      weight: set.weight,
    })),
  })),
};

export const dietDetails = {
  title: assignedDietPlan.title,
  calories: assignedDietPlan.calories,
  focus: assignedDietPlan.focus,
  meals: assignedDietPlan.meals,
};

export type DietMealStatus = {
  id: string;
  meal: string;
  checked: boolean;
  imageUri?: string;
  comment: string;
};

let dietMealState: DietMealStatus[] = [];
let dietComment = '';

export function getDietMealStatusItems(): DietMealStatus[] {
  const meals = assignedDietPlan.meals;

  if (
    dietMealState.length !== meals.length ||
    dietMealState.some((item, index) => item.meal !== meals[index].label)
  ) {
    dietMealState = meals.map((meal) => ({
      id: meal.id,
      meal: meal.label,
      checked: false,
      imageUri: undefined,
      comment: '',
    }));
  }

  return dietMealState;
}

export function updateDietMealStatus(id: string, changes: Partial<DietMealStatus>) {
  dietMealState = getDietMealStatusItems().map((item) =>
    item.id === id ? { ...item, ...changes } : item,
  );

  return dietMealState;
}

export function getDietProgress() {
  const items = getDietMealStatusItems();
  const checked = items.filter((item) => item.checked).length;
  const total = items.length || 1;

  return {
    checked,
    total,
    percent: (checked / total) * 100,
  };
}

export function setDietComment(comment: string) {
  dietComment = comment;
}

export function getDietComment() {
  return dietComment;
}

export const availableCoaches = coachProfiles;
export const clientProfile = demoClient;
export const myCoach = assignedCoach;

export const clientGoals = [
  { label: 'Goal', value: clientProfile.goal },
  { label: 'Current weight', value: clientProfile.metrics.weight },
  { label: 'Weekly change', value: clientProfile.metrics.weeklyChange },
  { label: 'Recovery', value: clientProfile.metrics.recovery },
  { label: 'Sleep', value: clientProfile.metrics.sleep },
];
