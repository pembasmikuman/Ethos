import * as Crypto from 'expo-crypto';
import { getDb, type Exercise } from './index';

export type Routine = { id: string; name: string };
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
  return db.getAllAsync<Routine>('SELECT id, name FROM routines ORDER BY name');
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
