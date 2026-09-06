import type { SQLiteDatabase } from 'expo-sqlite';

// [id, name, primary, secondary, equipment, rest, repMin, repMax, incrementKg]
type Row = [string, string, string, string, string, number, number, number, number];

const HEAVY = 210, HYPER = 150, ISO = 75;

const EXERCISES: Row[] = [
  // Chest
  ['bench', 'Barbell Bench Press', 'chest', 'triceps,delts', 'barbell', HEAVY, 5, 8, 2.5],
  ['incline-db', 'Incline Dumbbell Press', 'chest', 'triceps,delts', 'dumbbell', HYPER, 8, 12, 2],
  ['machine-press', 'Machine Chest Press', 'chest', 'triceps', 'machine', HYPER, 8, 12, 5],
  ['cable-fly', 'Cable Fly', 'chest', '', 'cable', ISO, 10, 15, 2.5],
  ['dips', 'Dips', 'chest', 'triceps', 'bodyweight', HYPER, 8, 12, 2.5],
  // Back
  ['deadlift', 'Deadlift', 'back', 'hamstrings,glutes', 'barbell', HEAVY, 3, 6, 5],
  ['pullup', 'Pull-up', 'back', 'biceps', 'bodyweight', HYPER, 6, 10, 2.5],
  ['lat-pulldown', 'Lat Pulldown', 'back', 'biceps', 'cable', HYPER, 8, 12, 5],
  ['bb-row', 'Barbell Row', 'back', 'biceps', 'barbell', HYPER, 6, 10, 2.5],
  ['cable-row', 'Seated Cable Row', 'back', 'biceps', 'cable', HYPER, 8, 12, 5],
  ['db-row', 'Dumbbell Row', 'back', 'biceps', 'dumbbell', HYPER, 8, 12, 2],
  // Quads
  ['squat', 'Barbell Back Squat', 'quads', 'glutes,hamstrings', 'barbell', HEAVY, 5, 8, 2.5],
  ['leg-press', 'Leg Press', 'quads', 'glutes', 'machine', HYPER, 8, 12, 10],
  ['hack-squat', 'Hack Squat', 'quads', 'glutes', 'machine', HYPER, 8, 12, 5],
  ['leg-ext', 'Leg Extension', 'quads', '', 'machine', ISO, 10, 15, 2.5],
  ['split-squat', 'Bulgarian Split Squat', 'quads', 'glutes', 'dumbbell', HYPER, 8, 12, 2],
  // Hamstrings / Glutes
  ['rdl', 'Romanian Deadlift', 'hamstrings', 'glutes,back', 'barbell', HEAVY, 6, 10, 2.5],
  ['leg-curl', 'Lying Leg Curl', 'hamstrings', '', 'machine', ISO, 10, 15, 2.5],
  ['seated-curl', 'Seated Leg Curl', 'hamstrings', '', 'machine', ISO, 10, 15, 2.5],
  ['hip-thrust', 'Hip Thrust', 'glutes', 'hamstrings', 'barbell', HYPER, 8, 12, 5],
  // Delts
  ['ohp', 'Overhead Press', 'delts', 'triceps', 'barbell', HEAVY, 5, 8, 2.5],
  ['db-shoulder', 'Dumbbell Shoulder Press', 'delts', 'triceps', 'dumbbell', HYPER, 8, 12, 2],
  ['lateral-raise', 'Lateral Raise', 'delts', '', 'dumbbell', ISO, 12, 20, 1],
  ['cable-lateral', 'Cable Lateral Raise', 'delts', '', 'cable', ISO, 12, 20, 1.25],
  ['rear-delt', 'Reverse Pec Deck', 'delts', 'back', 'machine', ISO, 12, 20, 2.5],
  ['face-pull', 'Face Pull', 'delts', 'back', 'cable', ISO, 12, 20, 2.5],
  // Biceps
  ['bb-curl', 'Barbell Curl', 'biceps', '', 'barbell', ISO, 8, 12, 2.5],
  ['db-curl', 'Dumbbell Curl', 'biceps', '', 'dumbbell', ISO, 8, 12, 1],
  ['hammer-curl', 'Hammer Curl', 'biceps', '', 'dumbbell', ISO, 8, 12, 1],
  ['preacher-curl', 'Preacher Curl', 'biceps', '', 'machine', ISO, 10, 15, 2.5],
  // Triceps
  ['pushdown', 'Cable Pushdown', 'triceps', '', 'cable', ISO, 10, 15, 2.5],
  ['overhead-ext', 'Overhead Cable Extension', 'triceps', '', 'cable', ISO, 10, 15, 2.5],
  ['skullcrusher', 'Skull Crusher', 'triceps', '', 'barbell', ISO, 8, 12, 2.5],
  // Calves / Abs
  ['calf-raise', 'Standing Calf Raise', 'calves', '', 'machine', ISO, 10, 15, 5],
  ['seated-calf', 'Seated Calf Raise', 'calves', '', 'machine', ISO, 12, 20, 5],
  ['cable-crunch', 'Cable Crunch', 'abs', '', 'cable', ISO, 10, 15, 2.5],
  ['leg-raise', 'Hanging Leg Raise', 'abs', '', 'bodyweight', ISO, 10, 15, 0],
];

export async function seed(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
  if ((row?.n ?? 0) > 0) return;
  await db.withTransactionAsync(async () => {
    for (const r of EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, equipment,
          default_rest_seconds, target_rep_min, target_rep_max, increment_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        r,
      );
    }
  });
}
