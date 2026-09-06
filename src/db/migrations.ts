import type { SQLiteDatabase } from 'expo-sqlite';

/** Ordered list. Never edit a shipped entry; append a new one. */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT DEFAULT '',
    equipment TEXT,
    default_rest_seconds INTEGER DEFAULT 120,
    target_rep_min INTEGER DEFAULT 8,
    target_rep_max INTEGER DEFAULT 12,
    increment_kg REAL DEFAULT 2.5
  );
  CREATE TABLE routines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE routine_exercises (
    id TEXT PRIMARY KEY,
    routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    order_index INTEGER NOT NULL,
    target_sets INTEGER DEFAULT 3
  );
  CREATE TABLE workout_sessions (
    id TEXT PRIMARY KEY,
    routine_id TEXT REFERENCES routines(id),
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    notes TEXT
  );
  CREATE TABLE logged_sets (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    set_number INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'working',
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    rir INTEGER,
    completed_at TEXT NOT NULL,
    overload_recommended INTEGER DEFAULT 0
  );
  CREATE INDEX idx_sets_exercise ON logged_sets(exercise_id, completed_at);
  `,
  // Machine brand / variant. Shown as "Name · Brand"; same movement on two machines = two exercises.
  `ALTER TABLE exercises ADD COLUMN brand TEXT NOT NULL DEFAULT '';`,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
