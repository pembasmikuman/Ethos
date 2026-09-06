import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';

// Extract the SQL strings without importing expo-sqlite types at runtime.
const src = readFileSync(new URL('../db/migrations.ts', import.meta.url), 'utf8');
const sqls = [...src.matchAll(/`([\s\S]*?)`/g)].map((m) => m[1]).filter((s) => /CREATE|ALTER/.test(s));

test('migrations apply cleanly on a fresh db', () => {
  const db = new Database(':memory:');
  for (const sql of sqls) db.exec(sql);
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all().map((r: any) => r.name);
  expect(tables).toEqual(expect.arrayContaining(['exercises', 'routines', 'routine_exercises', 'workout_sessions', 'logged_sets']));
});
