import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getDb } from '../db';

export type Photo = { id: string; session_id: string; file: string; created_at: string };

const dir = () => {
  const d = new Directory(Paths.document, 'photos');
  if (!d.exists) d.create();
  return d;
};
export const photoUri = (file: string) => new File(dir(), file).uri;

export async function sessionPhotos(sessionId: string): Promise<Photo[]> {
  const db = await getDb();
  return db.getAllAsync<Photo>('SELECT * FROM session_photos WHERE session_id = ? ORDER BY created_at', [sessionId]);
}

/** Camera or library. Copies the picked image into the app, downsized. Returns null if cancelled. */
export async function addPhoto(sessionId: string, source: 'camera' | 'library'): Promise<Photo | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return null;
  const id = Crypto.randomUUID();
  const file = `${id}.jpg`;
  new File(res.assets[0].uri).copy(new File(dir(), file));
  const photo = { id, session_id: sessionId, file, created_at: new Date().toISOString() };
  const db = await getDb();
  await db.runAsync('INSERT INTO session_photos (id, session_id, file, created_at) VALUES (?, ?, ?, ?)', [id, sessionId, file, photo.created_at]);
  return photo;
}

export async function deletePhoto(p: Photo): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM session_photos WHERE id = ?', [p.id]);
  const f = new File(dir(), p.file);
  if (f.exists) f.delete();
}

export async function setSessionNotes(sessionId: string, notes: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE workout_sessions SET notes = ? WHERE id = ?', [notes, sessionId]);
}

/** Base64 of every photo file, keyed by file name. For backups. */
export function readPhotoFiles(photos: Photo[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of photos) {
    const f = new File(dir(), p.file);
    if (f.exists) out[p.file] = f.base64Sync();
  }
  return out;
}

export function writePhotoFiles(files: Record<string, string>): void {
  for (const [name, b64] of Object.entries(files)) new File(dir(), name).write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}
