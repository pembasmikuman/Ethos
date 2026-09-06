import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listRoutines, recentSessions, setsSince, type Routine } from '../db/queries';
import { daysAgo, upNext, weeklyVolume, weekStart } from '../lib/progression';
import { DotBars } from '../components/DotBars';
import { DOCK_HEIGHT } from '../components/Dock';
import { useTheme } from '../lib/theme';
import { useWorkout } from '../store/workout';
import { useUi } from '../store/ui';
import { Doto, Label } from '../components/Text';

const MUSCLES: [string, string][] = [['CHEST', 'chest'], ['BACK', 'back'], ['QUAD', 'quads'], ['HAM', 'hamstrings'], ['GLUTE', 'glutes'], ['DELT', 'delts'], ['BI', 'biceps'], ['TRI', 'triceps'], ['CALF', 'calves'], ['ABS', 'abs']];

type Recent = Awaited<ReturnType<typeof recentSessions>>[number];

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const preview = useWorkout((s) => s.preview);
  const active = useWorkout((s) => s.sessionId !== null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const shown = useUi((s) => s.volumeMuscles);
  const toggle = useUi((s) => s.toggleVolumeMuscle);

  useFocusEffect(
    useCallback(() => {
      listRoutines().then((r) => setRoutines(upNext(r)));
      recentSessions().then(setRecent);
      setsSince(weekStart()).then((rows) => setVolume(weeklyVolume(rows)));
    }, []),
  );

  const go = async (r: Routine) => {
    if (busy) return;
    if (active) {
      router.push('/session');
      return;
    }
    setBusy(true);
    try {
      await preview(r);
      router.push('/session');
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>ETHOS</Doto>
        <Label>{today}</Label>
      </View>

      <View style={[s.panel, { backgroundColor: t.card, borderColor: t.line }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>This week · hard sets</Label>
          <Pressable onPress={() => setEditing((v) => !v)} hitSlop={12}><Label color={editing ? t.accent : t.green}>{editing ? 'Done' : '10–20 band'}</Label></Pressable>
        </View>
        <DotBars items={MUSCLES.filter(([, key]) => shown.includes(key)).map(([label, key]) => ({ label, value: volume[key] ?? 0 }))} />
        {editing && (
          <View style={s.chips}>
            {MUSCLES.map(([label, key]) => {
              const on = shown.includes(key);
              return (
                <Pressable key={key} onPress={() => toggle(key)} style={[s.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent' }]}>
                  <Label color={on ? t.bg : t.mute}>{label}</Label>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={[s.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Label>Routines</Label>
        <Pressable onPress={() => router.push('/routines')} hitSlop={12}><Label color={t.accent}>Edit</Label></Pressable>
      </View>
      {routines.length === 0 && <Label color={t.dim} style={{ paddingHorizontal: 4 }}>No routines. Tap Edit to build one.</Label>}
      {routines.map((r, i) => {
        const ago = daysAgo(r.last_done);
        const next = i === 0;
        return (
          <Pressable
            key={r.id}
            onPress={() => go(r)}
            style={({ pressed }) => [s.card, { backgroundColor: t.card, borderColor: next ? t.accent : t.line, opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={{ gap: 4 }}>
              <Doto size={28}>{r.name.toUpperCase()}</Doto>
              <Label color={next ? t.accent : t.dim}>{next ? 'Up next · ' : ''}{ago === null ? 'never done' : ago === 0 ? 'today' : `${ago}d ago`}</Label>
            </View>
            <Label color={t.accent}>{active ? 'Resume' : 'Preview'}</Label>
          </Pressable>
        );
      })}

      {recent.length > 0 && <Label style={s.section}>Recent</Label>}
      {recent.map((r) => {
        const mins = r.end_time ? Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000) : 0;
        const day = new Date(r.start_time).toLocaleDateString('en-GB', { weekday: 'short' });
        return (
          <Pressable key={r.id} onPress={() => router.push(`/history/${r.id}`)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
            <Doto size={20} style={{ flex: 1 }}>{r.title.toUpperCase()}</Doto>
            <Label color={t.dim}>{day}</Label>
            <Label>{mins} min</Label>
            <Label>{r.sets} sets</Label>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 12 },
  section: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1, minHeight: 64 },
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 44 },
});
