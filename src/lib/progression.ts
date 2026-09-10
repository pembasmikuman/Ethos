export type SetLike = { weight: number; reps: number; rir: number | null; set_type?: string };
export type ExerciseLike = {
  target_rep_min: number;
  target_rep_max: number;
  increment_kg: number;
  primary_muscle: string;
  secondary_muscles: string;
  /** Rule that picks next weight. Default double progression. */
  progression?: 'double' | 'linear' | 'greyskull';
  /** bodyweight: progress reps, not load. time: reps are seconds. */
  load?: 'weight' | 'bodyweight' | 'time';
};

const working = <T extends SetLike>(sets: T[]): T[] => sets.filter((s) => (s.set_type ?? 'working') === 'working');

/** Double progression: every working set hit the rep ceiling with at least 1 RIR. */
export function readyToOverload(lastSets: SetLike[], ex: ExerciseLike): boolean {
  const w = working(lastSets);
  return w.length > 0 && w.every((s) => s.reps >= ex.target_rep_max && (s.rir ?? 0) >= 1);
}

/**
 * Stall: the last `n` sessions all used the same top weight and none hit
 * `target_rep_min` on every set. Sessions ordered newest first.
 */
export function stalled(sessions: SetLike[][], ex: ExerciseLike, n = 3): boolean {
  const recent = sessions.slice(0, n).map(working).filter((s) => s.length > 0);
  if (recent.length < n) return false;
  const top = Math.max(...recent[0].map((s) => s.weight));
  return recent.every((sets) => Math.max(...sets.map((s) => s.weight)) === top && sets.some((s) => s.reps < ex.target_rep_min));
}

export type Next = { weight: number; overload: boolean; deload: boolean; /** Why this number, one line. */ why: string };

/**
 * Weight to prefill next session, by the exercise's rule.
 * double:    all sets at rep max with RIR >= 1 -> + increment.
 * linear:    all sets at rep min -> + increment; any set under min -> same.
 * greyskull: last set is AMRAP. >= 2x rep min -> + 2 increments; all sets at min -> + increment;
 *            any set under min -> -10 %.
 * bodyweight load: weight stays (added load only), overload flag means "add a rep".
 */
export function nextWeight(lastSets: SetLike[], ex: ExerciseLike): Next | null {
  const w = working(lastSets);
  if (w.length === 0) return null;
  const last = w[0].weight;
  const inc = ex.increment_kg;
  const allMin = w.every((s) => s.reps >= ex.target_rep_min);
  if (ex.load === 'bodyweight') {
    const up = readyToOverload(lastSets, ex);
    return { weight: last, overload: up, deload: false, why: up ? `all sets at ${ex.target_rep_max}, add a rep` : `same load, chase ${ex.target_rep_max} reps` };
  }
  switch (ex.progression ?? 'double') {
    case 'linear':
      return allMin
        ? { weight: last + inc, overload: true, deload: false, why: `all sets at ${ex.target_rep_min}+, +${inc} kg` }
        : { weight: last, overload: false, deload: false, why: `missed ${ex.target_rep_min}, same weight` };
    case 'greyskull': {
      const amrap = w[w.length - 1].reps;
      if (amrap >= ex.target_rep_min * 2) return { weight: last + inc * 2, overload: true, deload: false, why: `AMRAP ${amrap}, double jump +${inc * 2} kg` };
      if (allMin) return { weight: last + inc, overload: true, deload: false, why: `all sets at ${ex.target_rep_min}+, +${inc} kg` };
      return { weight: roundTo(last * 0.9), overload: false, deload: true, why: `missed ${ex.target_rep_min}, reset -10 %` };
    }
    default:
      return readyToOverload(lastSets, ex)
        ? { weight: last + inc, overload: true, deload: false, why: `all sets at ${ex.target_rep_max} with RIR, +${inc} kg` }
        : { weight: last, overload: false, deload: false, why: `same weight, chase ${ex.target_rep_max} reps` };
  }
}

export function roundTo(x: number, step = 2.5): number {
  return Math.round(x / step) * step;
}

/** Epley adjusted for reps in reserve. */
export function epley1RM(weight: number, reps: number, rir: number | null): number {
  return weight * (1 + (reps + (rir ?? 0)) / 30);
}

/** 40/60/80% ramp, rounded to 2.5 kg. */
export function warmupRamp(workingWeight: number): { weight: number; reps: number }[] {
  return [
    { weight: roundTo(workingWeight * 0.4), reps: 8 },
    { weight: roundTo(workingWeight * 0.6), reps: 5 },
    { weight: roundTo(workingWeight * 0.8), reps: 3 },
  ].filter((s) => s.weight > 0);
}

/** Hard sets per muscle. Primary counts 1, each secondary 0.5. */
export function weeklyVolume(sets: (SetLike & { primary_muscle: string; secondary_muscles: string })[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of working(sets)) {
    out[s.primary_muscle] = (out[s.primary_muscle] ?? 0) + 1;
    for (const m of s.secondary_muscles.split(',').map((x) => x.trim()).filter(Boolean)) {
      out[m] = (out[m] ?? 0) + 0.5;
    }
  }
  return out;
}

/** ISO string for Monday 00:00 local of the week containing `d`. */
export function weekStart(d = new Date()): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x.toISOString();
}

/** Routines ordered for Home: never done first, then longest ago. Stable on ties. */
export function upNext<T extends { last_done: string | null }>(routines: T[]): T[] {
  return [...routines].sort((a, b) => (a.last_done ?? '').localeCompare(b.last_done ?? ''));
}

export function daysAgo(iso: string | null, now = Date.now()): number | null {
  return iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : null;
}

/** Day grid, `weeks` rows oldest first, 7 columns Mon..Sun. Cell = sessions that day. */
export function sessionGrid(startTimes: string[], weeks = 6, now = Date.now()): number[][] {
  const grid = Array.from({ length: weeks }, () => Array(7).fill(0) as number[]);
  const monday = new Date(weekStart(new Date(now))).getTime();
  const DAY = 86400000;
  for (const iso of startTimes) {
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    const dayOff = Math.round((d.getTime() - monday) / DAY); // 0 = this Monday, negative = past
    const w = weeks - 1 + Math.floor(dayOff / 7);
    if (w >= 0 && w < weeks) grid[w][((dayOff % 7) + 7) % 7] += 1;
  }
  return grid;
}
