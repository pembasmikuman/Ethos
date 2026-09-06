import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listRoutines, recentSessions, setsSince, type Routine } from '../db/queries';
import { weeklyVolume, weekStart } from '../lib/progression';
import { DotBars } from '../components/DotBars';
import { DOCK_HEIGHT } from '../components/Dock';
import { useTheme } from '../lib/theme';
import { useWorkout } from '../store/workout';
import { Doto, Label } from '../components/Text';

const MUSCLES: [string, string][] = [['CHEST', 'chest'], ['BACK', 'back'], ['QUAD', 'quads'], ['HAM', 'hamstrings'], ['DELT', 'delts'], ['BI', 'biceps'], ['TRI', 'triceps']];

type Recent = Awaited<ReturnType<typeof recentSessions>>[number];

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const start = useWorkout((s) => s.start);
  const active = useWorkout((s) => s.sessionId !== null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      listRoutines().then(setRoutines);
      recentSessions().then(setRecent);
      setsSince(weekStart()).then((rows) => setVolume(weeklyVolume(rows)));
    }, []),
  );

  const go = async (r: Routine) => {
    if (busy) return;
    if (active) {
      router.push('/workout');
      return;
    }
    setBusy(true);
    try {
      await start(r);
      router.push('/workout');
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

      <View style={[s.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Label>Routines</Label>
        <Pressable onPress={() => router.push('/routines')} hitSlop={12}><Label color={t.accent}>Edit</Label></Pressable>
      </View>
      {routines.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => go(r)}
          style={({ pressed }) => [s.card, { backgroundColor: t.card, borderColor: t.line, opacity: pressed ? 0.85 : 1 }]}
        >
          <Doto size={28}>{r.name.toUpperCase()}</Doto>
          <Label color={t.accent}>Start</Label>
        </Pressable>
      ))}

      <View style={[s.panel, { backgroundColor: t.card, borderColor: t.line }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>This week · hard sets</Label>
          <Label color={t.green}>10–20 band</Label>
        </View>
        <DotBars items={MUSCLES.map(([label, key]) => ({ label, value: volume[key] ?? 0 }))} />
      </View>

      {recent.length > 0 && <Label style={s.section}>Recent</Label>}
      {recent.map((r) => {
        const mins = r.end_time ? Math.round((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000) : 0;
        const day = new Date(r.start_time).toLocaleDateString('en-GB', { weekday: 'short' });
        return (
          <View key={r.id} style={[s.row, { borderBottomColor: t.line }]}>
            <Doto size={20} style={{ flex: 1 }}>{r.title.toUpperCase()}</Doto>
            <Label color={t.dim}>{day}</Label>
            <Label>{mins} min</Label>
            <Label>{r.sets} sets</Label>
          </View>
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
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 44 },
});
