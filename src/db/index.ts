import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrate } from './migrations';
import { seed, seedRoutines } from './seed';

let dbPromise: Promise<SQLiteDatabase> | null = null;

/** Single shared connection. Migrates and seeds on first open. */
export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync('ethos.db');
      await migrate(db);
      await seed(db);
      await seedRoutines(db);
      return db;
    })();
  }
  return dbPromise;
}

export type Exercise = {
  id: string;
  name: string;
  brand: string;
  primary_muscle: string;
  secondary_muscles: string;
  equipment: string | null;
  default_rest_seconds: number;
  target_rep_min: number;
  target_rep_max: number;
  increment_kg: number;
};
