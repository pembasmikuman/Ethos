import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useTopInset } from '../lib/theme';
import { fmtClock, fmtKg } from '../lib/format';
import { doneHaptic, tapHaptic } from '../lib/rest';
import { useWorkout } from '../store/workout';
import { Doto, Label } from '../components/Text';
import { DotRing } from '../components/DotRing';

export default function Rest() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const w = useWorkout();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = w.rest ? Math.max(0, (w.rest.endsAt - now) / 1000) : 0;

  useEffect(() => {
    if (w.rest && left <= 0) {
      doneHaptic();
      w.skipRest();
      router.back();
    }
  }, [left <= 0, w.rest]);

  const block = w.blocks[w.exIdx];
  const next = block?.sets[w.focus.setIdx];
  const prev = block?.prev[w.focus.setIdx];

  const btn = (label: string, onPress: () => void, flex = 1, filled = false) => (
    <Pressable
      onPressIn={tapHaptic}
      onPress={onPress}
      style={({ pressed }) => [s.btn, { flex, borderColor: t.line, backgroundColor: filled ? t.card : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {filled ? <Label color={t.text} size={13}>{label}</Label> : <Doto size={22} color={t.mute}>{label}</Doto>}
    </Pressable>
  );

  return (
    <View style={[s.page, { backgroundColor: t.bg, paddingTop: top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={s.head}>
        <Label numberOfLines={1}>Rest · {block?.exercise.name}</Label>
        <Label>Set {w.focus.setIdx + 1} of {block?.sets.length}</Label>
      </View>

      <View style={s.ring}>
        <DotRing size={300} count={72} fraction={w.rest ? left / w.rest.total : 0} on={t.accent} off={t.dim} />
        <View style={s.center}>
          <Doto size={88}>{fmtClock(left)}</Doto>
          <Label>of {fmtClock(w.rest?.total ?? 0)}</Label>
        </View>
      </View>

      <View style={s.controls}>
        {btn('−30', () => w.adjustRest(-30))}
        {btn('+30', () => w.adjustRest(30))}
        {btn('Skip', async () => { await w.skipRest(); router.back(); }, 1.4, true)}
      </View>

      {next && (
        <View style={[s.next, { backgroundColor: t.card, borderColor: t.line }]}>
          <Label>Up next · Set {w.focus.setIdx + 1}</Label>
          <View style={s.nums}>
            <Doto size={34}>{next.weight || '–'}</Doto><Label color={t.dim}>kg</Label>
            <Doto size={34}>{block.exercise.target_rep_max}</Doto><Label color={t.dim}>target</Label>
          </View>
          {prev && <Label color={t.dim} size={10}>prev {fmtKg(prev.weight)} × {prev.reps}{prev.rir != null ? ` @ ${prev.rir}` : ''}</Label>}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, alignItems: 'center' },
  head: { alignSelf: 'stretch', gap: 6, paddingHorizontal: 4 },
  ring: { marginTop: 48, width: 300, height: 300 },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 },
  controls: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 40 },
  btn: { height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  next: { marginTop: 'auto', alignSelf: 'stretch', padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  nums: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
});
