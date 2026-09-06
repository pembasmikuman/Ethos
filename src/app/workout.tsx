import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { applyKey, fmtClock, fmtKg } from '../lib/format';
import { doneHaptic } from '../lib/rest';
import { useWorkout } from '../store/workout';
import { Doto, Label } from '../components/Text';
import { Numpad } from '../components/Numpad';
import { SetRow } from '../components/SetRow';

export default function Workout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const w = useWorkout();
  const block = w.blocks[w.exIdx];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!block) return null;

  const focusedSet = block.sets[w.focus.setIdx];
  const onKey = (k: string) => {
    if (!focusedSet) return;
    const max = w.focus.field === 'weight' ? 5 : 2;
    if ((k === '+' || k === '-' || k === '.') && w.focus.field !== 'weight') return;
    w.input(applyKey(focusedSet[w.focus.field], k, max));
  };
  const nextField = (): 'reps' | 'rir' | null => {
    if (w.focus.field === 'weight') return 'reps';
    if (w.focus.field === 'reps' && focusedSet?.type === 'working') return 'rir';
    return null;
  };
  const onDone = async () => {
    const nf = nextField();
    if (nf) {
      w.setFocus(w.focus.setIdx, nf);
      return;
    }
    await w.completeSet();
    doneHaptic();
    if (useWorkout.getState().rest) router.push('/rest');
  };
  const doneLabel = nextField() ? `Next · ${nextField()}` : 'Done · Start rest';
  const onFinish = () =>
    Alert.alert('End workout?', 'Finish saves it. Cancel deletes every set logged this session.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel session', style: 'destructive', onPress: async () => { await w.cancel(); router.replace('/'); } },
      { text: 'Finish', onPress: async () => { await w.finish(); router.replace('/'); } },
    ]);

  const restLeft = w.rest ? Math.round((w.rest.endsAt - now) / 1000) : 0;
  let working = 0;

  return (
    <View style={[s.page, { backgroundColor: t.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={s.head}>
        <View style={{ gap: 4, flex: 1 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable onPress={() => router.back()} hitSlop={10}><Label color={t.text}>‹ Home</Label></Pressable>
            <Label>{w.title} · {w.exIdx + 1} / {w.blocks.length}</Label>
          </View>
          <Doto size={30} numberOfLines={1}>{block.exercise.name.toUpperCase()}</Doto>
        </View>
        <Pressable onPress={onFinish} hitSlop={10} style={{ alignItems: 'flex-end', gap: 4 }}>
          <Label>Elapsed</Label>
          <Doto size={22} color={t.mute}>{fmtClock((now - w.startedAt) / 1000)}</Doto>
        </Pressable>
      </View>

      {block.overload && (
        <View style={[s.banner, { backgroundColor: t.warnBg, borderColor: t.warnLine }]}>
          <View style={[s.dot, { backgroundColor: t.accent }]} />
          <Label color={t.accent} style={{ flex: 1 }}>Ready to overload</Label>
          <Doto size={18} color={t.accent}>+{fmtKg(block.exercise.increment_kg)} kg</Doto>
        </View>
      )}
      {block.stalled && !block.overload && (
        <View style={[s.banner, { backgroundColor: t.card, borderColor: t.line }]}>
          <View style={[s.dot, { backgroundColor: t.mute }]} />
          <Label style={{ flex: 1 }}>Stalled 3 sessions · try −10%</Label>
        </View>
      )}
      {w.rest && restLeft > 0 && (
        <Pressable onPress={() => router.push('/rest')} style={[s.banner, { backgroundColor: t.warnBg, borderColor: t.warnLine }]}>
          <View style={[s.dot, { backgroundColor: t.accent }]} />
          <Label color={t.accent} style={{ flex: 1 }}>Resting</Label>
          <Doto size={18} color={t.accent}>{fmtClock(restLeft)}</Doto>
        </Pressable>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }}>
        {block.sets.map((set, i) => {
          if (set.type === 'working') working += 1;
          const n = working;
          return (
            <SetRow
              key={i}
              index={i}
              workingNumber={n}
              set={set}
              prev={set.type === 'working' ? block.prev[n - 1] : undefined}
              targetMax={block.exercise.target_rep_max}
              active={i === w.focus.setIdx}
              focusField={i === w.focus.setIdx ? w.focus.field : null}
              onFocus={(f) => w.setFocus(i, f)}
              onLongPress={() =>
                Alert.alert('Remove set?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => w.removeSet(i) },
                ])
              }
            />
          );
        })}
        <View style={s.actions}>
          <Pressable onPress={() => w.addSet('warmup')} hitSlop={8}><Label color={t.warm}>+ Warmups</Label></Pressable>
          <Pressable onPress={() => w.addSet()} hitSlop={8}><Label>+ Set</Label></Pressable>
        </View>
      </ScrollView>

      <View style={s.nav}>
        <Pressable disabled={w.exIdx === 0} onPress={() => w.setExercise(w.exIdx - 1)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Label color={w.exIdx === 0 ? t.dim : t.text}>‹ Prev</Label>
        </Pressable>
        <Label color={t.dim} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {w.blocks[w.exIdx + 1] ? `Next · ${w.blocks[w.exIdx + 1].exercise.name}` : 'Last exercise'}
        </Label>
        <Pressable disabled={!w.blocks[w.exIdx + 1]} onPress={() => w.setExercise(w.exIdx + 1)} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Label color={!w.blocks[w.exIdx + 1] ? t.dim : t.text}>Next ›</Label>
        </Pressable>
      </View>

      <Numpad onKey={onKey} onDone={onDone} doneLabel={doneLabel} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, gap: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, minHeight: 44 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 24, paddingHorizontal: 12, paddingVertical: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
});
