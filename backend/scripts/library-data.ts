import type { Equipment, MealType, MuscleGroup, TrainingDay } from "@prisma/client";

/**
 * The global exercise and diet-item library that seed.ts creates. Images and
 * video links are left for an admin to add; instructions likewise.
 *
 * Every muscle group and every equipment type has at least one exercise, and
 * scripts/seed.ts checks that before writing anything.
 */

export type ExerciseSeed = {
  name: string;
  trainingDay: TrainingDay;
  equipment: Equipment;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
};

export type DietItemSeed = {
  name: string;
  mealType: MealType;
  calories: number | null;
  proteinG: number | null;
  /** The serving the figures are for. */
  notes: string;
};

function ex(
  name: string,
  trainingDay: TrainingDay,
  equipment: Equipment,
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[] = [],
): ExerciseSeed {
  return { name, trainingDay, equipment, primaryMuscles, secondaryMuscles };
}

export const EXERCISES: ExerciseSeed[] = [
  // --- Chest ---------------------------------------------------------------
  ex("Barbell bench press", "CHEST", "BARBELL", ["CHEST"], ["TRICEPS", "SHOULDERS"]),
  ex("Incline barbell bench press", "CHEST", "BARBELL", ["CHEST"], ["SHOULDERS", "TRICEPS"]),
  ex("Decline barbell bench press", "CHEST", "BARBELL", ["CHEST"], ["TRICEPS"]),
  ex("Dumbbell bench press", "CHEST", "DUMBBELL", ["CHEST"], ["TRICEPS", "SHOULDERS"]),
  ex("Incline dumbbell bench press", "CHEST", "DUMBBELL", ["CHEST"], ["SHOULDERS", "TRICEPS"]),
  ex("Smith machine bench press", "CHEST", "MACHINE", ["CHEST"], ["TRICEPS", "SHOULDERS"]),
  ex("Machine chest press", "CHEST", "MACHINE", ["CHEST"], ["TRICEPS", "SHOULDERS"]),
  ex("Dumbbell fly", "CHEST", "DUMBBELL", ["CHEST"], ["SHOULDERS"]),
  ex("Pec deck fly", "CHEST", "MACHINE", ["CHEST"]),
  ex("Cable crossover", "CHEST", "CABLE", ["CHEST"], ["SHOULDERS"]),
  ex("Low-to-high cable fly", "CHEST", "CABLE", ["CHEST"], ["SHOULDERS"]),
  ex("Dumbbell pullover", "CHEST", "DUMBBELL", ["CHEST", "LATS"], ["TRICEPS"]),
  ex("Band chest press", "CHEST", "BANDS", ["CHEST"], ["TRICEPS"]),
  ex("Kettlebell floor press", "CHEST", "KETTLEBELL", ["CHEST"], ["TRICEPS"]),

  // --- Push (compound, several muscles) --------------------------------------
  ex("Push-up", "PUSH", "BODYWEIGHT", ["CHEST"], ["TRICEPS", "SHOULDERS", "CORE"]),
  ex("Decline push-up", "PUSH", "BODYWEIGHT", ["CHEST", "SHOULDERS"], ["TRICEPS"]),
  ex("Diamond push-up", "PUSH", "BODYWEIGHT", ["TRICEPS"], ["CHEST"]),
  ex("Chest dip", "PUSH", "BODYWEIGHT", ["CHEST"], ["TRICEPS", "SHOULDERS"]),
  ex("Close-grip bench press", "PUSH", "BARBELL", ["TRICEPS"], ["CHEST", "SHOULDERS"]),
  ex("Landmine press", "PUSH", "BARBELL", ["SHOULDERS", "CHEST"], ["TRICEPS", "CORE"]),
  ex("Pike push-up", "PUSH", "BODYWEIGHT", ["SHOULDERS"], ["TRICEPS", "CHEST"]),

  // --- Back ----------------------------------------------------------------
  ex("Barbell row", "BACK", "BARBELL", ["UPPER_BACK", "LATS"], ["TRAPS", "BICEPS"]),
  ex("Pendlay row", "BACK", "BARBELL", ["UPPER_BACK", "LATS"], ["TRAPS", "BICEPS"]),
  ex("T-bar row", "BACK", "BARBELL", ["UPPER_BACK", "LATS"], ["BICEPS", "TRAPS"]),
  ex("One-arm dumbbell row", "BACK", "DUMBBELL", ["LATS", "UPPER_BACK"], ["BICEPS"]),
  ex("Chest-supported dumbbell row", "BACK", "DUMBBELL", ["UPPER_BACK"], ["LATS", "BICEPS", "TRAPS"]),
  ex("Seated cable row", "BACK", "CABLE", ["UPPER_BACK", "LATS"], ["BICEPS"]),
  ex("Lat pulldown", "BACK", "CABLE", ["LATS"], ["BICEPS", "UPPER_BACK"]),
  ex("Close-grip lat pulldown", "BACK", "CABLE", ["LATS"], ["BICEPS"]),
  ex("Straight-arm pulldown", "BACK", "CABLE", ["LATS"], ["CORE"]),
  ex("Machine row", "BACK", "MACHINE", ["UPPER_BACK", "LATS"], ["BICEPS"]),
  ex("Kettlebell row", "BACK", "KETTLEBELL", ["UPPER_BACK", "LATS"], ["BICEPS"]),
  ex("Rack pull", "BACK", "BARBELL", ["UPPER_BACK", "TRAPS"], ["GLUTES", "HAMSTRINGS", "FOREARMS"]),
  ex("Back extension", "BACK", "BODYWEIGHT", ["GLUTES", "HAMSTRINGS"], ["CORE"]),
  ex("Barbell shrug", "BACK", "BARBELL", ["TRAPS"], ["FOREARMS"]),
  ex("Dumbbell shrug", "BACK", "DUMBBELL", ["TRAPS"], ["FOREARMS"]),

  // --- Pull (compound) -------------------------------------------------------
  ex("Pull-up", "PULL", "BODYWEIGHT", ["LATS"], ["BICEPS", "UPPER_BACK"]),
  ex("Chin-up", "PULL", "BODYWEIGHT", ["LATS", "BICEPS"], ["UPPER_BACK"]),
  ex("Assisted pull-up", "PULL", "MACHINE", ["LATS"], ["BICEPS"]),
  ex("Inverted row", "PULL", "BODYWEIGHT", ["UPPER_BACK"], ["LATS", "BICEPS"]),
  ex("Deadlift", "PULL", "BARBELL", ["HAMSTRINGS", "GLUTES", "UPPER_BACK"], ["TRAPS", "FOREARMS", "QUADS", "CORE"]),
  ex("Band pull-apart", "PULL", "BANDS", ["UPPER_BACK", "SHOULDERS"], ["TRAPS"]),

  // --- Shoulders -------------------------------------------------------------
  ex("Overhead press", "SHOULDERS", "BARBELL", ["SHOULDERS"], ["TRICEPS", "CORE"]),
  ex("Push press", "SHOULDERS", "BARBELL", ["SHOULDERS"], ["TRICEPS", "QUADS"]),
  ex("Seated dumbbell shoulder press", "SHOULDERS", "DUMBBELL", ["SHOULDERS"], ["TRICEPS"]),
  ex("Arnold press", "SHOULDERS", "DUMBBELL", ["SHOULDERS"], ["TRICEPS"]),
  ex("Machine shoulder press", "SHOULDERS", "MACHINE", ["SHOULDERS"], ["TRICEPS"]),
  ex("Kettlebell overhead press", "SHOULDERS", "KETTLEBELL", ["SHOULDERS"], ["TRICEPS", "CORE"]),
  ex("Band overhead press", "SHOULDERS", "BANDS", ["SHOULDERS"], ["TRICEPS"]),
  ex("Handstand push-up", "SHOULDERS", "BODYWEIGHT", ["SHOULDERS"], ["TRICEPS", "TRAPS"]),
  ex("Dumbbell lateral raise", "SHOULDERS", "DUMBBELL", ["SHOULDERS"], ["TRAPS"]),
  ex("Cable lateral raise", "SHOULDERS", "CABLE", ["SHOULDERS"]),
  ex("Band lateral raise", "SHOULDERS", "BANDS", ["SHOULDERS"]),
  ex("Dumbbell front raise", "SHOULDERS", "DUMBBELL", ["SHOULDERS"], ["CHEST"]),
  ex("Reverse pec deck", "SHOULDERS", "MACHINE", ["SHOULDERS", "UPPER_BACK"], ["TRAPS"]),
  ex("Bent-over reverse fly", "SHOULDERS", "DUMBBELL", ["SHOULDERS", "UPPER_BACK"], ["TRAPS"]),
  ex("Face pull", "SHOULDERS", "CABLE", ["SHOULDERS", "UPPER_BACK"], ["TRAPS"]),
  ex("Upright row", "SHOULDERS", "BARBELL", ["SHOULDERS", "TRAPS"], ["BICEPS"]),

  // --- Arms: biceps ----------------------------------------------------------
  ex("Barbell curl", "ARMS", "BARBELL", ["BICEPS"], ["FOREARMS"]),
  ex("EZ-bar curl", "ARMS", "BARBELL", ["BICEPS"], ["FOREARMS"]),
  ex("Dumbbell curl", "ARMS", "DUMBBELL", ["BICEPS"], ["FOREARMS"]),
  ex("Hammer curl", "ARMS", "DUMBBELL", ["BICEPS", "FOREARMS"]),
  ex("Incline dumbbell curl", "ARMS", "DUMBBELL", ["BICEPS"]),
  ex("Concentration curl", "ARMS", "DUMBBELL", ["BICEPS"]),
  ex("Machine preacher curl", "ARMS", "MACHINE", ["BICEPS"]),
  ex("Cable curl", "ARMS", "CABLE", ["BICEPS"], ["FOREARMS"]),
  ex("Band curl", "ARMS", "BANDS", ["BICEPS"]),

  // --- Arms: triceps ---------------------------------------------------------
  ex("Rope triceps pushdown", "ARMS", "CABLE", ["TRICEPS"]),
  ex("Straight-bar triceps pushdown", "ARMS", "CABLE", ["TRICEPS"]),
  ex("Overhead cable triceps extension", "ARMS", "CABLE", ["TRICEPS"]),
  ex("Skull crusher", "ARMS", "BARBELL", ["TRICEPS"]),
  ex("Overhead dumbbell triceps extension", "ARMS", "DUMBBELL", ["TRICEPS"]),
  ex("Dumbbell triceps kickback", "ARMS", "DUMBBELL", ["TRICEPS"]),
  ex("Bench dip", "ARMS", "BODYWEIGHT", ["TRICEPS"], ["CHEST", "SHOULDERS"]),
  ex("Parallel bar triceps dip", "ARMS", "BODYWEIGHT", ["TRICEPS"], ["CHEST", "SHOULDERS"]),

  // --- Arms: forearms --------------------------------------------------------
  ex("Wrist curl", "ARMS", "DUMBBELL", ["FOREARMS"]),
  ex("Reverse wrist curl", "ARMS", "DUMBBELL", ["FOREARMS"]),
  ex("Reverse barbell curl", "ARMS", "BARBELL", ["FOREARMS"], ["BICEPS"]),
  ex("Dead hang", "ARMS", "BODYWEIGHT", ["FOREARMS"], ["LATS"]),

  // --- Legs: quads -----------------------------------------------------------
  ex("Back squat", "LEGS", "BARBELL", ["QUADS", "GLUTES"], ["HAMSTRINGS", "CORE"]),
  ex("Front squat", "LEGS", "BARBELL", ["QUADS"], ["GLUTES", "CORE", "UPPER_BACK"]),
  ex("Goblet squat", "LEGS", "KETTLEBELL", ["QUADS", "GLUTES"], ["CORE"]),
  ex("Leg press", "LEGS", "MACHINE", ["QUADS", "GLUTES"], ["HAMSTRINGS"]),
  ex("Hack squat", "LEGS", "MACHINE", ["QUADS"], ["GLUTES"]),
  ex("Leg extension", "LEGS", "MACHINE", ["QUADS"]),
  ex("Bulgarian split squat", "LEGS", "DUMBBELL", ["QUADS", "GLUTES"], ["HAMSTRINGS"]),
  ex("Walking lunge", "LEGS", "DUMBBELL", ["QUADS", "GLUTES"], ["HAMSTRINGS", "CALVES"]),
  ex("Reverse lunge", "LEGS", "BODYWEIGHT", ["QUADS", "GLUTES"], ["HAMSTRINGS"]),
  ex("Dumbbell step-up", "LEGS", "DUMBBELL", ["QUADS", "GLUTES"]),
  ex("Bodyweight squat", "LEGS", "BODYWEIGHT", ["QUADS", "GLUTES"]),
  ex("Pistol squat", "LEGS", "BODYWEIGHT", ["QUADS", "GLUTES"], ["CORE"]),
  ex("Wall sit", "LEGS", "BODYWEIGHT", ["QUADS"], ["GLUTES"]),

  // --- Legs: hamstrings and glutes -------------------------------------------
  ex("Romanian deadlift", "LEGS", "BARBELL", ["HAMSTRINGS", "GLUTES"], ["FOREARMS", "CORE"]),
  ex("Single-leg Romanian deadlift", "LEGS", "KETTLEBELL", ["HAMSTRINGS", "GLUTES"], ["CORE"]),
  ex("Sumo deadlift", "LEGS", "BARBELL", ["GLUTES", "QUADS", "HAMSTRINGS"], ["TRAPS", "FOREARMS"]),
  ex("Good morning", "LEGS", "BARBELL", ["HAMSTRINGS"], ["GLUTES", "CORE"]),
  ex("Lying leg curl", "LEGS", "MACHINE", ["HAMSTRINGS"], ["CALVES"]),
  ex("Seated leg curl", "LEGS", "MACHINE", ["HAMSTRINGS"]),
  ex("Nordic hamstring curl", "LEGS", "BODYWEIGHT", ["HAMSTRINGS"]),
  ex("Cable pull-through", "LEGS", "CABLE", ["GLUTES", "HAMSTRINGS"]),
  ex("Barbell hip thrust", "LEGS", "BARBELL", ["GLUTES"], ["HAMSTRINGS"]),
  ex("Glute bridge", "LEGS", "BODYWEIGHT", ["GLUTES"], ["HAMSTRINGS", "CORE"]),
  ex("Cable glute kickback", "LEGS", "CABLE", ["GLUTES"]),
  ex("Hip abduction machine", "LEGS", "MACHINE", ["GLUTES"]),
  ex("Banded lateral walk", "LEGS", "BANDS", ["GLUTES"]),

  // --- Legs: calves ----------------------------------------------------------
  ex("Standing calf raise", "LEGS", "MACHINE", ["CALVES"]),
  ex("Seated calf raise", "LEGS", "MACHINE", ["CALVES"]),
  ex("Single-leg dumbbell calf raise", "LEGS", "DUMBBELL", ["CALVES"]),

  // --- Core ----------------------------------------------------------------
  ex("Plank", "CORE", "BODYWEIGHT", ["CORE"], ["SHOULDERS"]),
  ex("Side plank", "CORE", "BODYWEIGHT", ["OBLIQUES"], ["CORE"]),
  ex("Hollow body hold", "CORE", "BODYWEIGHT", ["CORE"]),
  ex("Dead bug", "CORE", "BODYWEIGHT", ["CORE"]),
  ex("Crunch", "CORE", "BODYWEIGHT", ["CORE"]),
  ex("Bicycle crunch", "CORE", "BODYWEIGHT", ["OBLIQUES", "CORE"]),
  ex("Hanging leg raise", "CORE", "BODYWEIGHT", ["CORE"], ["FOREARMS"]),
  ex("Mountain climber", "CORE", "BODYWEIGHT", ["CORE"], ["CARDIO", "SHOULDERS"]),
  ex("Cable crunch", "CORE", "CABLE", ["CORE"]),
  ex("Pallof press", "CORE", "CABLE", ["OBLIQUES", "CORE"]),
  ex("Cable woodchopper", "CORE", "CABLE", ["OBLIQUES"], ["CORE", "SHOULDERS"]),
  ex("Russian twist", "CORE", "OTHER", ["OBLIQUES"], ["CORE"]),
  ex("Ab wheel rollout", "CORE", "OTHER", ["CORE"], ["LATS", "SHOULDERS"]),
  ex("Kettlebell windmill", "CORE", "KETTLEBELL", ["OBLIQUES"], ["SHOULDERS", "HAMSTRINGS"]),
  ex("Suitcase carry", "CORE", "KETTLEBELL", ["OBLIQUES"], ["FOREARMS", "TRAPS"]),

  // --- Cardio ----------------------------------------------------------------
  ex("Treadmill run", "CARDIO", "MACHINE", ["CARDIO"], ["QUADS", "CALVES"]),
  ex("Incline treadmill walk", "CARDIO", "MACHINE", ["CARDIO"], ["GLUTES", "CALVES"]),
  ex("Stationary bike", "CARDIO", "MACHINE", ["CARDIO"], ["QUADS"]),
  ex("Assault bike", "CARDIO", "MACHINE", ["CARDIO"], ["QUADS", "SHOULDERS"]),
  ex("Rowing machine", "CARDIO", "MACHINE", ["CARDIO"], ["UPPER_BACK", "QUADS"]),
  ex("Stair climber", "CARDIO", "MACHINE", ["CARDIO"], ["GLUTES", "QUADS"]),
  ex("Jump rope", "CARDIO", "OTHER", ["CARDIO"], ["CALVES"]),
  ex("Battle ropes", "CARDIO", "OTHER", ["CARDIO"], ["SHOULDERS", "CORE"]),
  ex("Jumping jacks", "CARDIO", "BODYWEIGHT", ["CARDIO"]),
  ex("Brisk walk", "CARDIO", "BODYWEIGHT", ["CARDIO"]),

  // --- Full body -------------------------------------------------------------
  ex("Burpee", "FULL_BODY", "BODYWEIGHT", ["FULL_BODY"], ["CARDIO", "CHEST"]),
  ex("Kettlebell swing", "FULL_BODY", "KETTLEBELL", ["GLUTES", "HAMSTRINGS"], ["CORE", "SHOULDERS"]),
  ex("Kettlebell clean and press", "FULL_BODY", "KETTLEBELL", ["FULL_BODY"], ["SHOULDERS"]),
  ex("Turkish get-up", "FULL_BODY", "KETTLEBELL", ["FULL_BODY"], ["SHOULDERS", "CORE"]),
  ex("Power clean", "FULL_BODY", "BARBELL", ["FULL_BODY"], ["TRAPS", "GLUTES", "HAMSTRINGS"]),
  ex("Dumbbell thruster", "FULL_BODY", "DUMBBELL", ["QUADS", "SHOULDERS"], ["GLUTES", "TRICEPS"]),
  ex("Farmer's carry", "FULL_BODY", "DUMBBELL", ["FOREARMS", "TRAPS"], ["CORE"]),
  ex("Medicine ball slam", "FULL_BODY", "OTHER", ["FULL_BODY"], ["CORE", "SHOULDERS"]),
  ex("Wall ball", "FULL_BODY", "OTHER", ["QUADS", "SHOULDERS"], ["GLUTES", "CARDIO"]),
  ex("Sled push", "FULL_BODY", "OTHER", ["QUADS", "GLUTES"], ["CARDIO", "CALVES"]),
];

function item(name: string, mealType: MealType, calories: number | null, proteinG: number | null, notes: string): DietItemSeed {
  return { name, mealType, calories, proteinG, notes };
}

/**
 * Everyday Indian food with rough figures for a typical home serving. They are
 * a starting point for a coach, not a nutrition label.
 */
export const DIET_ITEMS: DietItemSeed[] = [
  // --- Breakfast -------------------------------------------------------------
  item("Poha", "BREAKFAST", 250, 5, "1 plate (about 150 g)"),
  item("Upma", "BREAKFAST", 250, 6, "1 bowl (about 200 g)"),
  item("Vegetable oats", "BREAKFAST", 220, 8, "1 bowl, 40 g oats"),
  item("Oats with milk", "BREAKFAST", 300, 12, "40 g oats in 1 glass toned milk"),
  item("Daliya", "BREAKFAST", 200, 7, "1 bowl broken-wheat porridge"),
  item("Ragi porridge", "BREAKFAST", 190, 5, "1 bowl"),
  item("Idli with sambar", "BREAKFAST", 220, 7, "2 idli, 1 katori sambar"),
  item("Plain dosa with sambar", "BREAKFAST", 300, 7, "1 dosa, 1 katori sambar"),
  item("Masala dosa", "BREAKFAST", 400, 8, "1 dosa with potato filling"),
  item("Besan chilla", "BREAKFAST", 250, 12, "2 chillas"),
  item("Moong dal chilla", "BREAKFAST", 240, 14, "2 chillas"),
  item("Aloo paratha", "BREAKFAST", 300, 6, "1 paratha"),
  item("Paneer paratha", "BREAKFAST", 330, 12, "1 paratha"),
  item("Methi thepla", "BREAKFAST", 240, 6, "2 theplas"),
  item("Boiled eggs", "BREAKFAST", 155, 13, "2 whole eggs"),
  item("Egg bhurji", "BREAKFAST", 220, 13, "2 eggs"),
  item("Masala omelette", "BREAKFAST", 200, 13, "2 eggs"),
  item("Egg white omelette", "BREAKFAST", 70, 14, "4 egg whites"),
  item("Bread omelette", "BREAKFAST", 300, 15, "2 eggs, 2 slices bread"),
  item("Peanut butter toast", "BREAKFAST", 350, 13, "2 slices brown bread, 2 tbsp peanut butter"),

  // --- Dal, curries and protein ----------------------------------------------
  item("Dal tadka", "LUNCH", 180, 9, "1 katori (about 150 g)"),
  item("Moong dal", "LUNCH", 150, 9, "1 katori"),
  item("Dal makhani", "DINNER", 280, 10, "1 katori"),
  item("Rajma", "LUNCH", 210, 11, "1 katori"),
  item("Chole", "LUNCH", 240, 10, "1 katori"),
  item("Kadhi", "LUNCH", 160, 5, "1 katori"),
  item("Sambar", "LUNCH", 130, 6, "1 katori"),
  item("Palak paneer", "DINNER", 250, 12, "1 katori"),
  item("Matar paneer", "DINNER", 270, 12, "1 katori"),
  item("Paneer bhurji", "DINNER", 300, 18, "100 g paneer"),
  item("Paneer tikka", "DINNER", 280, 18, "100 g paneer"),
  item("Soya chunks curry", "LUNCH", 180, 18, "1 katori, 30 g dry chunks"),
  item("Tofu stir-fry", "DINNER", 180, 14, "100 g tofu with vegetables"),
  item("Grilled chicken breast", "LUNCH", 250, 45, "150 g cooked"),
  item("Chicken curry", "DINNER", 280, 22, "1 katori"),
  item("Tandoori chicken", "DINNER", 260, 30, "2 pieces"),
  item("Chicken tikka", "DINNER", 240, 36, "150 g"),
  item("Egg curry", "LUNCH", 250, 14, "2 eggs with gravy"),
  item("Fish curry", "LUNCH", 220, 22, "1 katori"),
  item("Grilled fish", "DINNER", 200, 32, "150 g"),
  item("Mutton curry", "DINNER", 330, 22, "1 katori"),

  // --- Roti and rice ---------------------------------------------------------
  item("Roti", "LUNCH", 100, 3, "1 medium whole-wheat chapati"),
  item("Multigrain roti", "LUNCH", 110, 4, "1 roti"),
  item("Bajra roti", "DINNER", 120, 3, "1 roti"),
  item("Jowar roti", "DINNER", 110, 3, "1 roti"),
  item("Steamed rice", "LUNCH", 200, 4, "1 cup cooked"),
  item("Brown rice", "LUNCH", 215, 5, "1 cup cooked"),
  item("Vegetable pulao", "LUNCH", 270, 6, "1 cup"),
  item("Curd rice", "LUNCH", 250, 7, "1 bowl"),
  item("Khichdi", "DINNER", 250, 9, "1 bowl"),
  item("Chicken biryani", "LUNCH", 500, 25, "1 plate"),
  item("Veg biryani", "LUNCH", 400, 9, "1 plate"),

  // --- Sabzi, salad and curd -------------------------------------------------
  item("Mixed vegetable sabzi", "LUNCH", 120, 3, "1 katori"),
  item("Aloo gobi", "LUNCH", 150, 3, "1 katori"),
  item("Bhindi sabzi", "DINNER", 120, 3, "1 katori"),
  item("Green salad", "LUNCH", 50, 2, "1 bowl cucumber, tomato, onion, carrot"),
  item("Cucumber raita", "LUNCH", 90, 4, "1 katori"),
  item("Curd", "LUNCH", 100, 6, "1 katori plain dahi (about 150 g)"),
  item("Hung curd", "SNACK", 100, 8, "100 g"),

  // --- Snacks ----------------------------------------------------------------
  item("Roasted chana", "SNACK", 110, 6, "30 g"),
  item("Roasted makhana", "SNACK", 110, 3, "30 g"),
  item("Sprouts chaat", "SNACK", 150, 9, "1 bowl"),
  item("Dhokla", "SNACK", 160, 6, "4 pieces"),
  item("Mixed nuts", "SNACK", 180, 5, "30 g"),
  item("Fruit chaat", "SNACK", 120, 1, "1 bowl"),
  item("Buttermilk", "SNACK", 40, 2, "1 glass chaas"),
  item("Apple", "SNACK", 95, 0, "1 medium"),
  item("Coconut water", "SNACK", 45, 0, "1 glass"),

  // --- Around training -------------------------------------------------------
  item("Banana", "PRE_WORKOUT", 105, 1, "1 medium"),
  item("Banana with peanut butter", "PRE_WORKOUT", 200, 5, "1 banana, 1 tbsp peanut butter"),
  item("Dates", "PRE_WORKOUT", 70, 1, "3 dates"),
  item("Black coffee", "PRE_WORKOUT", 5, 0, "1 cup, no sugar"),
  item("Whey protein shake", "POST_WORKOUT", 120, 24, "1 scoop in water"),
  item("Whey protein with milk", "POST_WORKOUT", 270, 32, "1 scoop in 1 glass toned milk"),
  item("Banana milkshake", "POST_WORKOUT", 250, 9, "1 glass toned milk, 1 banana"),
  item("Boiled egg whites", "POST_WORKOUT", 70, 14, "4 egg whites"),
];
