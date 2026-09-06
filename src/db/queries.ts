import * as Crypto from 'expo-crypto';
import { getDb, type Exercise } from './index';

export type Routine = { id: string; name: string; exercises: number };
export type LoggedSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  set_type: 'warmup' | 'working';
  weight: number;
  reps: number;
  rir: number | null;
  completed_at: string;
};

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDb();
  return db.getAllAsync<Routine>('SELECT r.id, r.name, (SELECT COUNT(*) FROM routine_exercises re WHERE re.routine_id = r.id) AS exercises FROM routines r ORDER BY r.name');
}

export async function routineExercises(routineId: string): Promise<(Exercise & { target_sets: number })[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT e.*, re.target_sets FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = ? ORDER BY re.order_index`,
    [routineId],
  );
}

/** Working sets from the last session that contained this exercise, ordered by set number. */
export async function prevSets(exerciseId: string): Promise<LoggedSet[]> {
  const db = await getDb();
  const last = await db.getFirstAsync<{ session_id: string }>(
    `SELECT session_id FROM logged_sets WHERE exercise_id = ? AND set_type = 'working'
     ORDER BY completed_at DESC LIMIT 1`,
    [exerciseId],
  );
  if (!last) return [];
  return db.getAllAsync<LoggedSet>(
    `SELECT * FROM logged_sets WHERE session_id = ? AND exercise_id = ? AND set_type = 'working' ORDER BY set_number`,
    [last.session_id, exerciseId],
  );
}

export async function startSession(routine: Routine): Promise<string> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  await db.runAsync(
    'INSERT INTO workout_sessions (id, routine_id, title, start_time) VALUES (?, ?, ?, ?)',
    [id, routine.id, routine.name, new Date().toISOString()],
  );
  return id;
}

export async function insertSet(s: Omit<LoggedSet, 'id' | 'completed_at'>): Promise<string> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO logged_sets (id, session_id, exercise_id, set_number, set_type, weight, reps, rir, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, s.session_id, s.exercise_id, s.set_number, s.set_type, s.weight, s.reps, s.rir, new Date().toISOString()],
  );
  return id;
}

export async function finishSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workout_sessions SET end_time = ? WHERE id = ?', [new Date().toISOString(), sessionId]);
}

export async function recentSessions(limit = 3) {
  const db = await getDb();
  return db.getAllAsync<{ id: string; title: string; start_time: string; end_time: string | null; sets: number }>(
    `SELECT s.id, s.title, s.start_time, s.end_time,
       (SELECT COUNT(*) FROM logged_sets l WHERE l.session_id = s.id AND l.set_type = 'working') AS sets
     FROM workout_sessions s WHERE s.end_time IS NOT NULL ORDER BY s.start_time DESC LIMIT ?`,
    [limit],
  );
}

/** Working sets grouped by session for the last `n` sessions containing this exercise, newest first. */
export async function recentExerciseSessions(exerciseId: string, n = 3): Promise<LoggedSet[][]> {
  const db = await getDb();
  const ids = await db.getAllAsync<{ session_id: string }>(
    `SELECT session_id FROM logged_sets WHERE exercise_id = ? AND set_type = 'working'
     GROUP BY session_id ORDER BY MAX(completed_at) DESC LIMIT ?`,
    [exerciseId, n],
  );
  const out: LoggedSet[][] = [];
  for (const { session_id } of ids) {
    out.push(
      await db.getAllAsync<LoggedSet>(
        `SELECT * FROM logged_sets WHERE session_id = ? AND exercise_id = ? AND set_type = 'working' ORDER BY set_number`,
        [session_id, exerciseId],
      ),
    );
  }
  return out;
}

/** Working sets since `sinceIso` with muscle info, for weekly volume. */
export async function setsSince(sinceIso: string) {
  const db = await getDb();
  return db.getAllAsync<LoggedSet & { primary_muscle: string; secondary_muscles: string }>(
    `SELECT l.*, e.primary_muscle, e.secondary_muscles FROM logged_sets l
     JOIN exercises e ON e.id = l.exercise_id
     WHERE l.completed_at >= ? AND l.set_type = 'working'`,
    [sinceIso],
  );
}

/** Delete a session and its sets. */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM logged_sets WHERE session_id = ?', [sessionId]);
  await db.runAsync('DELETE FROM workout_sessions WHERE id = ?', [sessionId]);
}

export type SessionRow = { id: string; title: string; start_time: string; end_time: string | null; sets: number; volume_kg: number };

export async function allSessions(): Promise<SessionRow[]> {
  const db = await getDb();
  return db.getAllAsync<SessionRow>(
    `SELECT s.id, s.title, s.start_time, s.end_time,
       (SELECT COUNT(*) FROM logged_sets l WHERE l.session_id = s.id AND l.set_type = 'working') AS sets,
       (SELECT COALESCE(SUM(weight * reps), 0) FROM logged_sets l WHERE l.session_id = s.id AND l.set_type = 'working') AS volume_kg
     FROM workout_sessions s WHERE s.end_time IS NOT NULL ORDER BY s.start_time DESC`,
  );
}

export async function sessionById(id: string): Promise<SessionRow | null> {
  const db = await getDb();
  return db.getFirstAsync<SessionRow>(
    `SELECT s.id, s.title, s.start_time, s.end_time,
       (SELECT COUNT(*) FROM logged_sets l WHERE l.session_id = s.id AND l.set_type = 'working') AS sets,
       (SELECT COALESCE(SUM(weight * reps), 0) FROM logged_sets l WHERE l.session_id = s.id AND l.set_type = 'working') AS volume_kg
     FROM workout_sessions s WHERE s.id = ?`,
    [id],
  );
}

/** Sets of a session with exercise names, in logged order. */
export async function sessionSets(sessionId: string) {
  const db = await getDb();
  return db.getAllAsync<LoggedSet & { name: string; target_rep_max: number }>(
    `SELECT l.*, e.name, e.target_rep_max FROM logged_sets l JOIN exercises e ON e.id = l.exercise_id
     WHERE l.session_id = ? ORDER BY l.completed_at`,
    [sessionId],
  );
}

export async function updateSet(id: string, weight: number, reps: number, rir: number | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE logged_sets SET weight = ?, reps = ?, rir = ? WHERE id = ?', [weight, reps, rir, id]);
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM logged_sets WHERE id = ?', [id]);
}

// ---- Routine editing ----

export async function allExercises(): Promise<Exercise[]> {
  const db = await getDb();
  return db.getAllAsync<Exercise>('SELECT * FROM exercises ORDER BY primary_muscle, name');
}

export async function createRoutine(name: string): Promise<string> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  await db.runAsync('INSERT INTO routines (id, name) VALUES (?, ?)', [id, name]);
  return id;
}

export async function renameRoutine(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routines SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routine_exercises WHERE routine_id = ?', [id]);
  await db.runAsync('UPDATE workout_sessions SET routine_id = NULL WHERE routine_id = ?', [id]);
  await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
}

export type RoutineExercise = Exercise & { re_id: string; order_index: number; target_sets: number };

export async function routineExerciseRows(routineId: string): Promise<RoutineExercise[]> {
  const db = await getDb();
  return db.getAllAsync<RoutineExercise>(
    `SELECT e.*, re.id AS re_id, re.order_index, re.target_sets FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id WHERE re.routine_id = ? ORDER BY re.order_index`,
    [routineId],
  );
}

export async function addRoutineExercise(routineId: string, exerciseId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM routine_exercises WHERE routine_id = ?', [routineId]);
  await db.runAsync(
    'INSERT INTO routine_exercises (id, routine_id, exercise_id, order_index, target_sets) VALUES (?, ?, ?, ?, 3)',
    [Crypto.randomUUID(), routineId, exerciseId, row?.n ?? 0],
  );
}

export async function removeRoutineExercise(reId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routine_exercises WHERE id = ?', [reId]);
}

export async function setTargetSets(reId: string, n: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE routine_exercises SET target_sets = ? WHERE id = ?', [Math.max(1, Math.min(10, n)), reId]);
}

/** Rewrite order_index for the given ordered list of routine_exercises ids. */
export async function reorderRoutine(reIds: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < reIds.length; i++) await db.runAsync('UPDATE routine_exercises SET order_index = ? WHERE id = ?', [i, reIds[i]]);
  });
}
