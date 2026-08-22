import { ComponentProps } from 'react';

import { SymbolView } from 'expo-symbols';

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
    eyebrow: 'Strength + mobility',
    summary: 'Lower body focus with a short core finisher.',
    metric: '42 min',
    detail: 'Squats, lunges, hip work, and 8 minutes of core.',
    route: '/workout',
    iconName: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
    accentColor: '#0F8B8D',
    accentBackground: '#E4F5F4',
  },
  {
    id: 'diet',
    title: "Today's diet",
    eyebrow: 'Balanced fuel',
    summary: 'High protein meals with steady carbs around training.',
    metric: '1,950 kcal',
    detail: 'Three meals, two snacks, and a hydration target.',
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
  title: 'Lower body strength',
  time: '42 min',
  focus: 'Build controlled strength through legs, glutes, and trunk.',
  exercises: [
    {
      id: 'goblet-squat',
      name: 'Goblet squat',
      note: 'Keep ribs stacked and pause for control at the bottom.',
      sets: [
        { id: 'goblet-squat-1', setNumber: 1, reps: '8', weight: '18 kg' },
        { id: 'goblet-squat-2', setNumber: 2, reps: '8', weight: '20 kg' },
        { id: 'goblet-squat-3', setNumber: 3, reps: '8', weight: '20 kg' },
        { id: 'goblet-squat-4', setNumber: 4, reps: '8', weight: '22 kg' },
      ],
    },
    {
      id: 'reverse-lunge',
      name: 'Reverse lunge',
      note: 'Step back softly and keep the front knee tracking over toes.',
      sets: [
        { id: 'reverse-lunge-1', setNumber: 1, reps: '10 each', weight: '10 kg' },
        { id: 'reverse-lunge-2', setNumber: 2, reps: '10 each', weight: '12 kg' },
        { id: 'reverse-lunge-3', setNumber: 3, reps: '10 each', weight: '12 kg' },
      ],
    },
    {
      id: 'hip-bridge',
      name: 'Hip bridge',
      note: 'Drive through heels and hold the top position for one second.',
      sets: [
        { id: 'hip-bridge-1', setNumber: 1, reps: '12', weight: 'Bodyweight' },
        { id: 'hip-bridge-2', setNumber: 2, reps: '12', weight: 'Bodyweight' },
        { id: 'hip-bridge-3', setNumber: 3, reps: '12', weight: 'Bodyweight' },
      ],
    },
    {
      id: 'core-finisher',
      name: 'Core finisher',
      note: 'Move slowly and stop if your lower back takes over.',
      sets: [
        { id: 'core-finisher-1', setNumber: 1, reps: '40 sec', weight: 'Dead bug' },
        { id: 'core-finisher-2', setNumber: 2, reps: '40 sec', weight: 'Side plank' },
      ],
    },
  ],
};

export const dietDetails = {
  title: 'Balanced training day',
  calories: '1,950 kcal',
  focus: 'Keep protein high and place most carbs around the workout.',
  meals: ['Breakfast: eggs, toast, fruit', 'Lunch: chicken rice bowl', 'Snack: Greek yogurt and berries', 'Dinner: salmon, potatoes, greens', 'Hydration: 2.5L water'],
};
