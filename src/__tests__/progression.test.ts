import { test, expect } from 'bun:test';
import { readyToOverload, stalled, nextWeight, epley1RM, warmupRamp, weeklyVolume, roundTo } from '../lib/progression';

const ex = { target_rep_min: 8, target_rep_max: 12, increment_kg: 2.5, primary_muscle: 'chest', secondary_muscles: 'triceps,delts' };
const set = (weight: number, reps: number, rir: number | null = 2, set_type = 'working') => ({ weight, reps, rir, set_type });

test('overload when all working sets hit ceiling with rir >= 1', () => {
  expect(readyToOverload([set(80, 12), set(80, 12), set(80, 12, 1)], ex)).toBe(true);
  expect(readyToOverload([set(80, 12), set(80, 11), set(80, 12)], ex)).toBe(false);
  expect(readyToOverload([set(80, 12, 0), set(80, 12), set(80, 12)], ex)).toBe(false);
  expect(readyToOverload([set(40, 12, null, 'warmup'), set(80, 12), set(80, 12)], ex)).toBe(true);
  expect(readyToOverload([], ex)).toBe(false);
});

test('nextWeight bumps by increment on overload', () => {
  expect(nextWeight([set(80, 12), set(80, 12)], ex)).toEqual({ weight: 82.5, overload: true, deload: false });
  expect(nextWeight([set(80, 10), set(80, 9)], ex)).toEqual({ weight: 80, overload: false, deload: false });
  expect(nextWeight([], ex)).toBeNull();
});

test('stalled after 3 sessions same weight under rep floor', () => {
  const bad = [set(80, 7), set(80, 6)];
  expect(stalled([bad, bad, bad], ex)).toBe(true);
  expect(stalled([bad, bad], ex)).toBe(false);
  expect(stalled([bad, [set(77.5, 7)], bad], ex)).toBe(false);
  expect(stalled([[set(80, 8), set(80, 8)], bad, bad], ex)).toBe(false);
});

test('epley with rir', () => {
  expect(epley1RM(100, 5, 0)).toBeCloseTo(116.67, 1);
  expect(epley1RM(100, 5, 2)).toBeCloseTo(123.33, 1);
});

test('warmup ramp rounds to 2.5', () => {
  expect(warmupRamp(100)).toEqual([{ weight: 40, reps: 8 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 }]);
  expect(warmupRamp(82.5)).toEqual([{ weight: 32.5, reps: 8 }, { weight: 50, reps: 5 }, { weight: 65, reps: 3 }]);
  expect(roundTo(33.1)).toBe(32.5);
});

test('weekly volume credits secondary at half', () => {
  const v = weeklyVolume([
    { ...set(80, 10), primary_muscle: 'chest', secondary_muscles: 'triceps,delts' },
    { ...set(80, 10), primary_muscle: 'chest', secondary_muscles: 'triceps,delts' },
    { ...set(40, 10, null, 'warmup'), primary_muscle: 'chest', secondary_muscles: '' },
    { ...set(20, 12), primary_muscle: 'triceps', secondary_muscles: '' },
  ]);
  expect(v).toEqual({ chest: 2, triceps: 2, delts: 1 });
});

import { daysAgo, upNext } from '../lib/progression';

test('upNext: never done first, then oldest', () => {
  const r = [{ id: 'a', last_done: '2026-09-05' }, { id: 'b', last_done: null }, { id: 'c', last_done: '2026-09-01' }];
  expect(upNext(r).map((x) => x.id)).toEqual(['b', 'c', 'a']);
});

test('daysAgo', () => {
  expect(daysAgo(null)).toBeNull();
  expect(daysAgo('2026-09-01T10:00:00Z', Date.parse('2026-09-04T09:00:00Z'))).toBe(2);
});

import { sessionsPerWeek } from '../lib/progression';

test('sessionsPerWeek buckets by Monday weeks, oldest first', () => {
  const now = Date.parse('2026-09-06T12:00:00'); // Sunday
  const out = sessionsPerWeek(['2026-09-01T10:00:00', '2026-09-06T09:00:00', '2026-08-26T10:00:00', '2026-06-01T10:00:00'], 4, now);
  expect(out).toEqual([0, 0, 1, 2]);
});
