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
