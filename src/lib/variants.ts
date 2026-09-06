/** Group exercises sharing a base name (same movement, different machine brand). Keeps input order. */
export function groupVariants<T extends { base?: string; name: string; primary_muscle: string }>(list: T[]): { key: string; base: string; muscle: string; items: T[] }[] {
  const out: { key: string; base: string; muscle: string; items: T[] }[] = [];
  for (const e of list) {
    const base = e.base ?? e.name;
    const key = `${e.primary_muscle}|${base}`;
    const g = out.find((x) => x.key === key);
    if (g) g.items.push(e);
    else out.push({ key, base, muscle: e.primary_muscle, items: [e] });
  }
  return out;
}
