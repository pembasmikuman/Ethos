import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { fmtClock } from '../lib/format';
import { tapHaptic } from '../lib/rest';
import { useWorkout } from '../store/workout';
import { Doto, Label } from '../components/Text';
import { DOCK_HEIGHT } from '../components/Dock';
import { DragRow, ROW_H, useDragList } from '../components/DragRow';

/** Session overview: exercise order, progress, add/swap/remove. Tap a row to log it. */
export default function Session() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const w = useWorkout();
  const [dragging, setDragging] = useState(false);
  const drag = useDragList();
  const [now] = useState(Date.now());

  if (!w.sessionId) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const open = (i: number) => { w.setExercise(i); router.push('/workout'); };
  const menu = (i: number) => {
    const b = w.blocks[i];
    Alert.alert(b.exercise.name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Swap', onPress: () => { w.setExercise(i); router.push('/routines/pick?session=swap'); } },
      { text: 'Remove', style: 'destructive', onPress: () => w.removeExercise(i) },
    ]);
  };
  const add = () => { w.setExercise(w.blocks.length - 1); router.push('/routines/pick?session=add'); };
  const finish = () =>
    Alert.alert('End session?', `${done} of ${total} sets logged.`, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Cancel session', style: 'destructive', onPress: async () => { await w.cancel(); router.dismissTo('/'); } },
      { text: 'Finish', onPress: async () => { await w.finish(); router.dismissTo('/'); } },
    ]);
  const done = w.blocks.reduce((n, b) => n + b.sets.filter((x) => x.done).length, 0);
  const total = w.blocks.reduce((n, b) => n + b.sets.length, 0);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} scrollEnabled={!dragging} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <View style={{ gap: 4 }}>
          <Label>{fmtClock((now - w.startedAt) / 1000)} elapsed</Label>
          <Doto size={36}>{w.title.toUpperCase()}</Doto>
        </View>
        <Pressable onPress={finish} hitSlop={10} style={{ alignItems: 'flex-end', gap: 4 }}>
          <Label color={t.accent}>Finish</Label>
          <Doto size={22} color={t.mute}>{done}/{total}</Doto>
        </Pressable>
      </View>

      {w.blocks.map((b, i) => {
        const d = b.sets.filter((x) => x.done).length;
        const full = d === b.sets.length && b.sets.length > 0;
        const current = i === w.exIdx;
        return (
          <DragRow key={b.exercise.id} index={i} count={w.blocks.length} drag={drag} onGrab={() => { setDragging(true); tapHaptic(); }} onDrop={(f, to) => { setDragging(false); if (f !== to) w.reorderExercises(f, to); }}>
            <Pressable onPress={() => open(i)} onLongPress={() => menu(i)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, backgroundColor: t.bg, opacity: pressed ? 0.7 : 1 }]}>
              <Label color={current ? t.accent : t.dim} style={{ width: 22 }}>{String(i + 1).padStart(2, '0')}</Label>
              <View style={{ flex: 1, gap: 4 }}>
                <Doto size={20} color={full ? t.mute : t.text}>{b.exercise.name.toUpperCase()}</Doto>
                <Label color={t.dim}>{b.sets.map((x) => (x.done ? '●' : '○')).join(' ')}</Label>
              </View>
              <Doto size={18} color={full ? t.green : t.mute}>{d}/{b.sets.length}</Doto>
              <View style={{ width: 36 }} />
            </Pressable>
          </DragRow>
        );
      })}
      <Label color={t.dim} style={{ paddingHorizontal: 4, paddingTop: 8 }}>Tap to log · drag ≡ · hold to swap or remove</Label>

      <Pressable onPress={add} style={({ pressed }) => [s.add, { borderColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
        <Label color={t.accent}>+ Add exercise</Label>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, borderBottomWidth: 1, height: ROW_H },
  add: { marginTop: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center' },
});
