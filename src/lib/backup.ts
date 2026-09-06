import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDb } from '../db';

const TABLES = ['exercises', 'routines', 'routine_exercises', 'workout_sessions', 'logged_sets'] as const;

export type Backup = { app: 'ethos'; version: 1; exported_at: string } & Record<(typeof TABLES)[number], Record<string, unknown>[]>;

export async function dumpBackup(): Promise<Backup> {
  const db = await getDb();
  const out: Record<string, unknown> = { app: 'ethos', version: 1, exported_at: new Date().toISOString() };
  for (const t of TABLES) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return out as Backup;
}

/** Write a JSON snapshot to cache and open the iOS share sheet. */
export async function exportBackup(): Promise<void> {
  const data = await dumpBackup();
  const stamp = data.exported_at.slice(0, 19).replace(/[:T]/g, '-');
  const file = new File(Paths.cache, `ethos_backup_${stamp}.json`);
  file.write(JSON.stringify(data));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
}

/** Let the user pick a backup. Returns parsed backup or null if cancelled. */
export async function pickBackup(): Promise<Backup | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const text = new File(res.assets[0].uri).textSync();
  const parsed = JSON.parse(text) as Partial<Backup>;
  if (parsed.app !== 'ethos' || !Array.isArray(parsed.logged_sets)) throw new Error('Not an Ethos backup');
  return parsed as Backup;
}

/** Wipe all tables and insert backup rows. Caller must confirm first. */
export async function restoreBackup(b: Backup): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...TABLES].reverse()) await db.execAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      for (const row of b[t] ?? []) {
        const cols = Object.keys(row);
        await db.runAsync(
          `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          cols.map((c) => row[c] as never),
        );
      }
    }
  });
}

export function backupSummary(b: Backup): string {
  return `${b.workout_sessions.length} sessions · ${b.logged_sets.length} sets · exported ${b.exported_at.slice(0, 10)}`;
}
