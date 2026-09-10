// Build src/data/library.json from openGym's exercise dataset (hasaneyldrm/exercises-dataset).
// Usage: bun scripts/build-library.ts ../openGym/frontend/src/lib/exercises-data.js
import { writeFileSync } from 'node:fs';

const MUSCLE: Record<string, string> = {
  pectorals: 'chest', 'serratus anterior': 'chest',
  lats: 'back', 'upper back': 'back', traps: 'back', spine: 'back', 'levator scapulae': 'back',
  quads: 'quads', adductors: 'quads', abductors: 'quads',
  hamstrings: 'hamstrings', glutes: 'glutes', delts: 'delts', biceps: 'biceps', triceps: 'triceps', calves: 'calves', abs: 'abs',
};
const SECONDARY: Record<string, string> = {
  chest: 'chest', 'upper chest': 'chest',
  'lower back': 'back', rhomboids: 'back', 'upper back': 'back', traps: 'back', trapezius: 'back', 'latissimus dorsi': 'back', lats: 'back', back: 'back',
  quadriceps: 'quads', 'inner thighs': 'quads',
  hamstrings: 'hamstrings', glutes: 'glutes',
  shoulders: 'delts', deltoids: 'delts', 'rear deltoids': 'delts', 'rotator cuff': 'delts',
  biceps: 'biceps', brachialis: 'biceps', triceps: 'triceps',
  calves: 'calves', soleus: 'calves',
  core: 'abs', obliques: 'abs', abdominals: 'abs', 'lower abs': 'abs', 'hip flexors': 'abs',
};
const EQUIP: Record<string, string> = {
  'body weight': 'bodyweight', assisted: 'bodyweight', weighted: 'bodyweight', 'wheel roller': 'bodyweight', roller: 'bodyweight',
  cable: 'cable', rope: 'cable', band: 'cable', 'resistance band': 'cable',
  barbell: 'barbell', 'ez barbell': 'barbell', 'olympic barbell': 'barbell', 'trap bar': 'barbell',
  dumbbell: 'dumbbell', kettlebell: 'dumbbell', 'medicine ball': 'dumbbell',
  'leverage machine': 'machine', 'sled machine': 'machine', 'smith machine': 'machine',
};

type Src = { id: string; n: string; eq: string; tg: string; sm: string[]; st: string[]; gif: string };
export type LibraryEntry = { id: string; name: string; muscle: string; secondary: string; equipment: string; steps: string[]; gif: string };

export function convert(src: Src[]): LibraryEntry[] {
  const out: LibraryEntry[] = [];
  for (const e of src) {
    const muscle = MUSCLE[e.tg];
    const equipment = EQUIP[e.eq];
    if (!muscle || !equipment) continue;
    const secondary = [...new Set(e.sm.map((m) => SECONDARY[m]).filter((m) => m && m !== muscle))].join(',');
    out.push({ id: e.id, name: e.n.replace(/в°/g, "°").replace(/\b\w/g, (c) => c.toUpperCase()), muscle, secondary, equipment, steps: e.st, gif: e.gif });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

if (import.meta.main) {
  const { EXDB } = await import(new URL(process.argv[2], `file://${process.cwd()}/`).href);
  const lib = convert(EXDB);
  writeFileSync('src/data/library.json', JSON.stringify(lib));
  console.log(lib.length, 'exercises');
}
