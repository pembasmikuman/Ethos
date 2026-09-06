import { test, expect } from 'bun:test';
import { groupVariants } from '../lib/variants';

test('groupVariants merges same base under one row', () => {
  const g = groupVariants([
    { base: 'Chest Press', name: 'Chest Press · A', primary_muscle: 'chest' },
    { base: 'Chest Press', name: 'Chest Press · B', primary_muscle: 'chest' },
    { base: 'Row', name: 'Row', primary_muscle: 'back' },
  ]);
  expect(g.map((x) => [x.base, x.items.length])).toEqual([['Chest Press', 2], ['Row', 1]]);
});
