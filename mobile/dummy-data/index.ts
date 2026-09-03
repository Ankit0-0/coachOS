export type CoachProfile = {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  rating: number;
  reviews: number;
  location: string;
  bio: string;
  availability: string;
  image: string;
  accent: string;
  focus: string;
  experience: string;
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

export type WorkoutPlan = {
  id: string;
  title: string;
  duration: string;
  focus: string;
  summary: string;
  difficulty: string;
  exercises: WorkoutExercise[];
};

export type DietPlan = {
  id: string;
  title: string;
  calories: string;
  focus: string;
  summary: string;
  meals: string[];
};

export type ClientProfile = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  goal: string;
  level: string;
  location: string;
  coachId: string;
  metrics: {
    weight: string;
    weeklyChange: string;
    recovery: string;
    sleep: string;
  };
};

export type ClientCoachAssignment = {
  clientId: string;
  coachId: string;
  workoutPlanId: string;
  dietPlanId: string;
  startedAt: string;
};

export const coachProfiles: CoachProfile[] = [
  {
    id: 'coach-amber',
    name: 'Amber Lee',
    title: 'Strength & performance coach',
    specialties: ['Strength', 'Hypertrophy', 'Mobility'],
    rating: 4.9,
    reviews: 128,
    location: 'Downtown Studio',
    bio: 'Helps busy professionals build strength without sacrificing recovery or consistency.',
    availability: 'Next opening: Tuesday 6:30 PM',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80',
    accent: '#0F8B8D',
    focus: 'Build durable strength and better movement quality.',
    experience: '8 years coaching',
  },
  {
    id: 'coach-niko',
    name: 'Niko Torres',
    title: 'Fat loss and conditioning coach',
    specialties: ['Fat loss', 'Conditioning', 'Nutrition'],
    rating: 4.8,
    reviews: 94,
    location: 'Northside Gym',
    bio: 'Designs sustainable fat-loss systems powered by structure, training rhythm, and simple habits.',
    availability: 'Next opening: Wednesday 7:00 AM',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80',
    accent: '#D97904',
    focus: 'Drive fat loss while protecting lean mass and energy.',
    experience: '6 years coaching',
  },
  {
    id: 'coach-sana',
    name: 'Sana Patel',
    title: 'Mobility and recovery specialist',
    specialties: ['Mobility', 'Recovery', 'Posture'],
    rating: 5.0,
    reviews: 76,
    location: 'Holistic Clinic',
    bio: 'Blends mobility, recovery planning, and coaching cues to help clients move with less pain.',
    availability: 'Next opening: Friday 12:00 PM',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
    accent: '#5B7CFA',
    focus: 'Improve mobility, posture, and recovery markers.',
    experience: '7 years coaching',
  },
];

export const workoutPlans: WorkoutPlan[] = [
  {
    id: 'lower-body-strength',
    title: 'Lower body strength',
    duration: '42 min',
    focus: 'Build controlled strength through legs, glutes, and trunk.',
    summary: 'Strength-focused lower-body work with controlled tempo and short recovery blocks.',
    difficulty: 'Intermediate',
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
  },
  {
    id: 'conditioning-power',
    title: 'Conditioning power circuit',
    duration: '30 min',
    focus: 'Raise heart rate with brisk intervals and efficient mechanics.',
    summary: 'Short intervals and pull focus to improve conditioning without burning out.',
    difficulty: 'Moderate',
    exercises: [
      {
        id: 'battle-ropes',
        name: 'Battle ropes',
        note: 'Keep shoulders down and work through full arm extension.',
        sets: [
          { id: 'battle-ropes-1', setNumber: 1, reps: '20 sec', weight: 'Moderate' },
          { id: 'battle-ropes-2', setNumber: 2, reps: '20 sec', weight: 'Moderate' },
          { id: 'battle-ropes-3', setNumber: 3, reps: '20 sec', weight: 'Moderate' },
        ],
      },
      {
        id: 'kettlebell-swing',
        name: 'Kettlebell swing',
        note: 'Hinge from the hips and keep the chest tall.',
        sets: [
          { id: 'kettlebell-swing-1', setNumber: 1, reps: '12', weight: '16 kg' },
          { id: 'kettlebell-swing-2', setNumber: 2, reps: '12', weight: '16 kg' },
        ],
      },
    ],
  },
];

export const dietPlans: DietPlan[] = [
  {
    id: 'balanced-training-day',
    title: 'Balanced training day',
    calories: '1,950 kcal',
    focus: 'Keep protein high and place most carbs around the workout.',
    summary: 'A high-protein split with steady carbs and recovery-friendly fats.',
    meals: [
      'Breakfast: eggs, toast, fruit',
      'Lunch: chicken rice bowl',
      'Snack: Greek yogurt and berries',
      'Dinner: salmon, potatoes, greens',
      'Hydration: 2.5L water',
    ],
  },
  {
    id: 'fat-loss-plate',
    title: 'Fat loss plate',
    calories: '1,700 kcal',
    focus: 'Sustainable calories with higher fiber and meal consistency.',
    summary: 'Prioritizes protein, volume, and steady energy through the day.',
    meals: [
      'Breakfast: oats, berries, protein shake',
      'Lunch: turkey salad wrap',
      'Snack: apple and cottage cheese',
      'Dinner: grilled chicken, cauliflower rice, greens',
      'Hydration: 2.2L water',
    ],
  },
];

export const demoClient: ClientProfile = {
  id: 'client-ava',
  name: 'Ava Brooks',
  avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80',
  age: 29,
  goal: 'Build strength and improve consistency',
  level: 'Intermediate',
  location: 'Austin, TX',
  coachId: 'coach-amber',
  metrics: {
    weight: '68 kg',
    weeklyChange: '+0.7 kg',
    recovery: '82%',
    sleep: '7.4 hrs',
  },
};

export const assignments: ClientCoachAssignment[] = [
  {
    clientId: 'client-ava',
    coachId: 'coach-amber',
    workoutPlanId: 'lower-body-strength',
    dietPlanId: 'balanced-training-day',
    startedAt: '2026-08-15',
  },
];

export const assignedCoach =
  coachProfiles.find((coach) => coach.id === demoClient.coachId) ?? coachProfiles[0];

export const assignedWorkoutPlan =
  workoutPlans.find((plan) => plan.id === assignments[0].workoutPlanId) ?? workoutPlans[0];

export const assignedDietPlan =
  dietPlans.find((plan) => plan.id === assignments[0].dietPlanId) ?? dietPlans[0];
