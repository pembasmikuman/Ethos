import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { fmtKg } from '../lib/format';
import type { Field, SetDraft } from '../store/workout';
import type { LoggedSet } from '../db/queries';
import { Doto, Label } from './Text';
import { Check } from './Check';

type Props = {
  index: number;
  workingNumber: number;
  set: SetDraft;
  prev?: LoggedSet;
  targetMax: number;
  active: boolean;
  focusField: Field | null;
  onFocus: (field: Field) => void;
  onLongPress: () => void;
};

export function SetRow({ index, workingNumber, set, prev, targetMax, active, focusField, onFocus, onLongPress }: Props) {
  const t = useTheme();
  const warm = set.type === 'warmup';
  const ink = set.done || active ? t.text : t.dim;
  const prevText = prev ? `prev ${fmtKg(prev.weight)} × ${prev.reps}${prev.rir != null ? ` @ ${prev.rir}` : ''}` : '';
  const hint = active && !warm ? `${prevText}${prevText ? ' · ' : ''}target ${targetMax}` : prevText;

  const cell = (field: Field, unit: string) => {
    const v = set[field];
    const focused = active && focusField === field;
    return (
      <Pressable onPress={() => onFocus(field)} style={s.cell} hitSlop={6}>
        <Doto size={26} color={focused ? t.accent : v === '' ? t.dim : ink}>{v === '' ? '–' : v}</Doto>
        <Label color={t.dim} size={10}>{unit}</Label>
      </Pressable>
    );
  };

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[s.row, { backgroundColor: active ? t.card : 'transparent', borderColor: active ? t.accent : 'transparent' }]}
    >
      <Label color={warm ? t.warm : t.mute} style={s.num}>{warm ? 'W' : String(workingNumber)}</Label>
      <View style={s.body}>
        <View style={s.cells}>
          {cell('weight', 'kg')}
          {cell('reps', 'reps')}
          {!warm && cell('rir', 'rir')}
        </View>
        {hint !== '' && <Label color={active ? t.mute : t.dim} size={10}>{hint}</Label>}
      </View>
      <View style={[s.check, { backgroundColor: set.done ? t.accent : 'transparent', borderColor: set.done ? t.accent : t.line }]}>
        {set.done && <Check color={t.bg} />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  num: { width: 26 },
  body: { flex: 1, gap: 2 },
  cells: { flexDirection: 'row', gap: 14, alignItems: 'baseline' },
  cell: { flexDirection: 'row', alignItems: 'baseline', gap: 6, minHeight: 44, paddingTop: 6 },
  check: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
