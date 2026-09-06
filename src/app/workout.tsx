import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { applyKey, fmtClock, fmtKg } from '../lib/format';
import { doneHaptic, tapHaptic } from '../lib/rest';
import { useWorkout } from '../store/workout';
import { Doto, Label } from '../components/Text';
import { Numpad } from '../components/Numpad';
import { SetRow } from '../components/SetRow';
import { DOCK_HEIGHT } from '../components/Dock';
import type { ExerciseBlock } from '../store/workout';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

function ExercisePage({ block, active, restLeft }: { block: ExerciseBlock; active: boolean; restLeft: number }) {
  const t = useTheme();
  const w = useWorkout();
  let working = 0;
  return (
    <View style={{ flex: 1, gap: 12 }}>
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
      {active && w.rest && restLeft > 0 && (
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
            <Swipeable
              key={set.id}
              friction={2}
              rightThreshold={64}
              overshootRight={false}
              onSwipeableOpen={() => { tapHaptic(); w.removeSet(i); }}
              renderRightActions={() => (
                <View style={{ width: 96, alignItems: 'center', justifyContent: 'center' }}><Label color={t.accent}>Remove</Label></View>
              )}
            >
            <SetRow
              index={i}
              workingNumber={n}
              set={set}
              prev={set.type === 'working' ? block.prev[n - 1] : undefined}
              targetMax={block.exercise.target_rep_max}
              active={active && i === w.focus.setIdx}
              focusField={active && i === w.focus.setIdx ? w.focus.field : null}
              onFocus={(f) => w.setFocus(i, f)}
            />
            </Swipeable>
          );
        })}
        <View style={s.actions}>
          <Pressable onPress={() => w.addSet('warmup')} hitSlop={8}><Label color={t.warm}>+ Warmups</Label></Pressable>
          <Pressable onPress={() => w.addSet()} hitSlop={8}><Label>+ Set</Label></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function Workout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const w = useWorkout();
  const block = w.blocks[w.exIdx];
  const [now, setNow] = useState(Date.now());
  const [pageH, setPageH] = useState(0);
  const pager = useRef<ScrollView>(null);
  const shown = useRef(w.exIdx);

  // Follow exIdx changes made elsewhere (overview, prev/next).
  useEffect(() => {
    if (shown.current === w.exIdx || !pageH) return;
    shown.current = w.exIdx;
    pager.current?.scrollTo({ y: w.exIdx * pageH, animated: true });
  }, [w.exIdx, pageH]);

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
      { text: 'Cancel session', style: 'destructive', onPress: async () => { await w.cancel(); router.dismissTo('/'); } },
      { text: 'Finish', onPress: async () => { await w.finish(); router.dismissTo('/'); } },
    ]);

  const onExerciseMenu = () =>
    Alert.alert(block.exercise.name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add exercise after', onPress: () => router.push('/routines/pick?session=add') },
      { text: 'Swap this exercise', onPress: () => router.push('/routines/pick?session=swap') },
    ]);

  const restLeft = w.rest ? Math.round((w.rest.endsAt - now) / 1000) : 0;

  return (
    <View style={[s.page, { backgroundColor: t.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + DOCK_HEIGHT }]}>
      <View style={s.head}>
        <View style={{ gap: 4, flex: 1 }}>
          <Pressable onPress={() => router.navigate('/session')} hitSlop={8}><Label color={t.accent}>‹ {w.title} · {w.exIdx + 1} / {w.blocks.length}</Label></Pressable>
          <Pressable onPress={onExerciseMenu} hitSlop={8}>
            <Doto size={30} numberOfLines={1}>{block.exercise.name.toUpperCase()}</Doto>
          </Pressable>
        </View>
        <Pressable onPress={onFinish} hitSlop={10} style={{ alignItems: 'flex-end', gap: 4 }}>
          <Label>Elapsed</Label>
          <Doto size={22} color={t.mute}>{fmtClock((now - w.startedAt) / 1000)}</Doto>
        </Pressable>
      </View>

      <ScrollView
        ref={pager}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setPageH(h);
          pager.current?.scrollTo({ y: w.exIdx * h, animated: false });
        }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / pageH);
          if (i !== shown.current) { shown.current = i; tapHaptic(); w.setExercise(i); }
        }}
        style={{ flex: 1 }}
      >
        {w.blocks.map((b, bi) => (
          <View key={b.exercise.id + bi} style={{ height: pageH || undefined, paddingRight: 14 }}>
            <ExercisePage block={b} active={bi === w.exIdx} restLeft={restLeft} />
          </View>
        ))}
      </ScrollView>
      <View pointerEvents="none" style={s.dots}>
        {w.blocks.map((b, i) => <View key={i} style={{ width: 6, height: i === w.exIdx ? 14 : 6, borderRadius: 3, backgroundColor: i === w.exIdx ? t.accent : b.sets.length > 0 && b.sets.every((x) => x.done) ? t.green : t.dim }} />)}
      </View>

      <View style={s.nav}>
        <Label color={t.dim} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {w.blocks[w.exIdx + 1] ? `↓ Next · ${w.blocks[w.exIdx + 1].exercise.name}` : 'Last exercise'}
        </Label>
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
  dots: { position: 'absolute', right: 16, top: '38%', gap: 6, alignItems: 'center' },
});
