import { create } from 'zustand';
import type { Exercise } from '../db';
import { finishSession, insertSet, prevSets, routineExercises, startSession, type LoggedSet, type Routine } from '../db/queries';
import { cancelRestDone, scheduleRestDone } from '../lib/rest';
import { fmtKg } from '../lib/format';

export type Field = 'weight' | 'reps' | 'rir';
export type SetDraft = { type: 'warmup' | 'working'; weight: string; reps: string; rir: string; done: boolean };
export type ExerciseBlock = { exercise: Exercise; sets: SetDraft[]; prev: LoggedSet[] };

type State = {
  sessionId: string | null;
  title: string;
  startedAt: number;
  blocks: ExerciseBlock[];
  exIdx: number;
  focus: { setIdx: number; field: Field };
  rest: { endsAt: number; total: number; notifId: string | null } | null;

  start: (routine: Routine) => Promise<void>;
  setExercise: (i: number) => void;
  setFocus: (setIdx: number, field: Field) => void;
  input: (value: string) => void;
  addSet: (type?: 'warmup' | 'working') => void;
  removeSet: (setIdx: number) => void;
  completeSet: () => Promise<void>;
  adjustRest: (deltaSeconds: number) => Promise<void>;
  skipRest: () => Promise<void>;
  finish: () => Promise<void>;
};

const emptySet = (weight: string, type: 'warmup' | 'working' = 'working'): SetDraft => ({ type, weight, reps: '', rir: '', done: false });

export const useWorkout = create<State>((set, get) => ({
  sessionId: null,
  title: '',
  startedAt: 0,
  blocks: [],
  exIdx: 0,
  focus: { setIdx: 0, field: 'weight' },
  rest: null,

  async start(routine) {
    const exs = await routineExercises(routine.id);
    const blocks: ExerciseBlock[] = [];
    for (const ex of exs) {
      const prev = await prevSets(ex.id);
      const lastWeight = prev.length ? fmtKg(prev[0].weight) : '';
      blocks.push({ exercise: ex, prev, sets: Array.from({ length: ex.target_sets }, () => emptySet(lastWeight)) });
    }
    const sessionId = await startSession(routine);
    set({ sessionId, title: routine.name, startedAt: Date.now(), blocks, exIdx: 0, focus: { setIdx: 0, field: 'weight' }, rest: null });
  },

  setExercise(i) {
    set({ exIdx: i, focus: { setIdx: 0, field: 'weight' } });
  },

  setFocus(setIdx, field) {
    set({ focus: { setIdx, field } });
  },

  input(value) {
    const { blocks, exIdx, focus } = get();
    const next = blocks.map((b, bi) =>
      bi !== exIdx ? b : { ...b, sets: b.sets.map((s, si) => (si !== focus.setIdx ? s : { ...s, [focus.field]: value })) },
    );
    set({ blocks: next });
  },

  addSet(type = 'working') {
    const { blocks, exIdx } = get();
    const b = blocks[exIdx];
    const last = b.sets[b.sets.length - 1];
    const sets = type === 'warmup' ? [emptySet('', 'warmup'), ...b.sets] : [...b.sets, emptySet(last?.weight ?? '')];
    set({ blocks: blocks.map((x, i) => (i === exIdx ? { ...x, sets } : x)) });
  },

  removeSet(setIdx) {
    const { blocks, exIdx, focus } = get();
    const sets = blocks[exIdx].sets.filter((_, i) => i !== setIdx);
    set({
      blocks: blocks.map((x, i) => (i === exIdx ? { ...x, sets } : x)),
      focus: { setIdx: Math.min(focus.setIdx, Math.max(0, sets.length - 1)), field: focus.field },
    });
  },

  async completeSet() {
    const { blocks, exIdx, focus, sessionId, rest } = get();
    if (!sessionId) return;
    const b = blocks[exIdx];
    const s = b.sets[focus.setIdx];
    const weight = parseFloat(s.weight);
    const reps = parseInt(s.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;
    const workingBefore = b.sets.slice(0, focus.setIdx).filter((x) => x.type === 'working').length;
    await insertSet({
      session_id: sessionId,
      exercise_id: b.exercise.id,
      set_number: s.type === 'warmup' ? 0 : workingBefore + 1,
      set_type: s.type,
      weight,
      reps,
      rir: s.rir === '' ? null : parseInt(s.rir, 10),
    });
    const sets = b.sets.map((x, i) => (i === focus.setIdx ? { ...x, done: true } : x));
    const nextIdx = sets.findIndex((x, i) => i > focus.setIdx && !x.done);
    await cancelRestDone(rest?.notifId ?? null);
    const total = b.exercise.default_rest_seconds;
    const notifId = await scheduleRestDone(total, `${b.exercise.name} · set ${focus.setIdx + 2}`);
    set({
      blocks: blocks.map((x, i) => (i === exIdx ? { ...x, sets } : x)),
      focus: { setIdx: nextIdx === -1 ? focus.setIdx : nextIdx, field: nextIdx === -1 ? focus.field : 'reps' },
      rest: { endsAt: Date.now() + total * 1000, total, notifId },
    });
  },

  async adjustRest(delta) {
    const { rest, blocks, exIdx } = get();
    if (!rest) return;
    await cancelRestDone(rest.notifId);
    const endsAt = Math.max(Date.now(), rest.endsAt + delta * 1000);
    const secs = Math.round((endsAt - Date.now()) / 1000);
    const notifId = await scheduleRestDone(secs, blocks[exIdx].exercise.name);
    set({ rest: { ...rest, endsAt, total: Math.max(rest.total + delta, secs), notifId } });
  },

  async skipRest() {
    const { rest } = get();
    await cancelRestDone(rest?.notifId ?? null);
    set({ rest: null });
  },

  async finish() {
    const { sessionId, rest } = get();
    await cancelRestDone(rest?.notifId ?? null);
    if (sessionId) await finishSession(sessionId);
    set({ sessionId: null, blocks: [], rest: null });
  },
}));
