/**
 * Convert a Daily Strength backup folder into an Ethos backup JSON.
 *   bun scripts/import-daily-strength.ts <backup-dir> [out.json]
 * Restore the output through Settings · Restore. It replaces everything in the app.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { EXERCISES as SEED } from '../src/db/seed';

const dir = process.argv[2];
const out = process.argv[3] ?? 'ethos_backup_from_daily_strength.json';
if (!dir) throw new Error('usage: bun scripts/import-daily-strength.ts <backup-dir> [out.json]');
const load = (name: string) => JSON.parse(readFileSync(join(dir, `${name}.json`), 'utf8'));

type DsSet = { warmUp: boolean; isComplete: boolean; set: number; weight: number; reps: number; restTime?: number; completedDate?: number; minReps?: number; maxReps?: number };
type DsExercise = { id: string; name: string; primaryMuscleGroups: { name: string }[]; secondaryMuscleGroups: { name: string }[]; equipmentRequired: { name: string; category: string }[] };
type DsSessionExercise = { position: number; exercise: DsExercise; workoutSessionSets: DsSet[] };
type DsSession = { id: string; name: string; startDate: number; endDate?: number; isComplete: boolean; workout?: { id: string; name: string }; workoutSessionExercises: DsSessionExercise[] };
type DsWorkout = { id: string; name: string; modifiedDate?: number; exerciseList: { position: number; exercise: DsExercise; workoutExerciseSets: DsSet[] }[] };

const MUSCLE: Record<string, string> = {
  quadriceps: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', gastrocnemius: 'calves', soleus: 'calves',
  chest: 'chest', 'upper chest': 'chest', 'middle chest': 'chest', 'lower chest': 'chest',
  lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back',
  shoulders: 'delts', 'front deltoids': 'delts', 'side deltoids': 'delts', 'rear deltoids': 'delts',
  biceps: 'biceps', 'biceps long head': 'biceps', 'biceps short head': 'biceps', brachialis: 'biceps',
  triceps: 'triceps', 'triceps lateral head': 'triceps', 'triceps long head': 'triceps',
  abs: 'abs', 'upper abs': 'abs', 'lower abs': 'abs', obliques: 'abs',
};
const muscle = (n: string) => MUSCLE[n.toLowerCase()] ?? n.toLowerCase().replace(/\s+/g, '_');

function equipment(e: DsExercise): string {
  const names = e.equipmentRequired.map((q) => q.name.toLowerCase());
  const cats = e.equipmentRequired.map((q) => q.category);
  if (names.some((n) => n.includes('barbell') || n.includes('ez'))) return 'barbell';
  if (names.some((n) => n.includes('dumbbell') || n.includes('kettlebell'))) return 'dumbbell';
  if (cats.includes('cable_machines')) return 'cable';
  if (cats.includes('weight_machines') || names.some((n) => n.includes('machine'))) return 'machine';
  return 'bodyweight';
}

const mode = (xs: number[], fallback: number) => {
  if (!xs.length) return fallback;
  const c = new Map<number, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0];
};
const iso = (ms: number) => new Date(ms).toISOString();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const sessions = (load('WorkoutSession') as DsSession[]).filter((s) => s.isComplete).sort((a, b) => a.startDate - b.startDate);
const workouts = load('Workout') as DsWorkout[];

// Exercises actually used, with defaults learned from history.
const used = new Map<string, { ex: DsExercise; rests: number[]; mins: number[]; maxs: number[] }>();
const touch = (ex: DsExercise) => {
  if (!used.has(ex.id)) used.set(ex.id, { ex, rests: [], mins: [], maxs: [] });
  return used.get(ex.id)!;
};
for (const s of sessions) for (const se of s.workoutSessionExercises) {
  const u = touch(se.exercise);
  for (const st of se.workoutSessionSets) if (st.restTime) u.rests.push(st.restTime);
}

// Routines: workouts inside the user's own plans (Schedule.custom), plus any other workout the sessions used.
type DsSchedule = { name: string; custom: boolean; workouts: DsWorkout[] };
const plans = (load('Schedule') as DsSchedule[]).filter((p) => p.custom);
const planOf = new Map<string, { plan: string; order: number }>();
const byName = new Map<string, DsWorkout>();
for (const p of plans) p.workouts.forEach((w, i) => { byName.set(w.name, w); planOf.set(w.name, { plan: p.name, order: i }); });
const usedWorkoutIds = new Set(sessions.map((s) => s.workout?.id).filter(Boolean) as string[]);
for (const w of workouts) {
  if (!usedWorkoutIds.has(w.id) || byName.has(w.name)) continue;
  byName.set(w.name, w);
}
const routines: Record<string, unknown>[] = [];
const routine_exercises: Record<string, unknown>[] = [];
for (const w of byName.values()) {
  const rid = randomUUID();
  const p = planOf.get(w.name);
  routines.push({ id: rid, name: w.name, plan: p?.plan ?? '', plan_order: p?.order ?? 0, notes: null, created_at: iso(w.modifiedDate ?? Date.now()) });
  [...w.exerciseList].sort((a, b) => a.position - b.position).forEach((we, i) => {
    const u = touch(we.exercise);
    for (const st of we.workoutExerciseSets) {
      if (st.minReps) u.mins.push(st.minReps);
      if (st.maxReps) u.maxs.push(st.maxReps);
      if (st.restTime) u.rests.push(st.restTime);
    }
    routine_exercises.push({ id: randomUUID(), routine_id: rid, exercise_id: we.exercise.id, order_index: i, target_sets: Math.max(1, we.workoutExerciseSets.filter((s) => !s.warmUp).length) });
  });
}

const exercises: Record<string, unknown>[] = [];
for (const { ex, rests, mins, maxs } of used.values()) {
  const eq = equipment(ex);
  const min = mode(mins, 8), max = Math.max(min + 1, mode(maxs, 12));
  exercises.push({
    id: ex.id, name: ex.name, brand: '', movement: '',
    primary_muscle: muscle(ex.primaryMuscleGroups[0]?.name ?? 'other'),
    secondary_muscles: [...new Set(ex.secondaryMuscleGroups.map((m) => muscle(m.name)))].join(','),
    equipment: eq,
    default_rest_seconds: mode(rests, 120),
    target_rep_min: min, target_rep_max: max,
    increment_kg: eq === 'dumbbell' ? 2 : eq === 'machine' ? 5 : 2.5,
  });
}
// Keep Ethos seed library for names not already covered.
const have = new Set(exercises.map((e) => norm(e.name as string)));
for (const r of SEED) {
  if (have.has(norm(r[1]))) continue;
  exercises.push({ id: r[0], name: r[1], brand: '', movement: r[9] ?? '', primary_muscle: r[2], secondary_muscles: r[3], equipment: r[4], default_rest_seconds: r[5], target_rep_min: r[6], target_rep_max: r[7], increment_kg: r[8] });
}

const workout_sessions: Record<string, unknown>[] = [];
const logged_sets: Record<string, unknown>[] = [];
const routineIdByWorkoutName = new Map([...byName.values()].map((w, i) => [w.name, routines[i].id as string]));
for (const s of sessions) {
  let last = s.startDate;
  const sid = s.id;
  for (const se of [...s.workoutSessionExercises].sort((a, b) => a.position - b.position)) {
    let n = 0;
    for (const st of [...se.workoutSessionSets].sort((a, b) => a.set - b.set)) {
      if (!st.isComplete || st.reps == null || st.weight == null) continue;
      if (!st.warmUp) n += 1;
      const at = st.completedDate ?? last;
      last = Math.max(last, at);
      logged_sets.push({
        id: randomUUID(), session_id: sid, exercise_id: se.exercise.id,
        set_number: st.warmUp ? 0 : n, set_type: st.warmUp ? 'warmup' : 'working',
        weight: st.weight, reps: st.reps, rir: null, completed_at: iso(at), overload_recommended: 0,
      });
    }
  }
  workout_sessions.push({
    id: sid, routine_id: s.workout ? routineIdByWorkoutName.get(s.workout.name) ?? null : null,
    title: s.name, start_time: iso(s.startDate), end_time: iso(s.endDate ?? last), notes: null,
  });
}

const backup = { app: 'ethos', version: 1, exported_at: new Date().toISOString(), exercises, routines, routine_exercises, workout_sessions, logged_sets };
writeFileSync(out, JSON.stringify(backup));
console.log(`${out}: ${exercises.length} exercises (${used.size} imported), ${routines.length} routines, ${workout_sessions.length} sessions, ${logged_sets.length} sets`);
