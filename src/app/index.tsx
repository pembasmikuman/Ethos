import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allSessions, listRoutines, recentSessions, setsSince, type Routine } from '../db/queries';
import { daysAgo, sessionGrid, upNext, weeklyVolume, weekStart } from '../lib/progression';
import { DotBars } from '../components/DotBars';
import { DOCK_HEIGHT } from '../components/Dock';
import { useTheme, useTopInset } from '../lib/theme';
import { useWorkout } from '../store/workout';
import { useUi } from '../store/ui';
import { Doto, Label } from '../components/Text';

const MUSCLES: [string, string][] = [['CHEST', 'chest'], ['BACK', 'back'], ['QUAD', 'quads'], ['HAM', 'hamstrings'], ['GLUTE', 'glutes'], ['DELT', 'delts'], ['BI', 'biceps'], ['TRI', 'triceps'], ['CALF', 'calves'], ['ABS', 'abs']];
const FULL: Record<string, string> = { quads: 'quadriceps', hamstrings: 'hamstrings', delts: 'delts', biceps: 'biceps', triceps: 'triceps', calves: 'calves', glutes: 'glutes', chest: 'chest', back: 'back', abs: 'abs' };

type Recent = Awaited<ReturnType<typeof recentSessions>>[number];

export default function Home() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const preview = useWorkout((s) => s.preview);
  const active = useWorkout((s) => s.sessionId !== null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [busy, setBusy] = useState(false);
  const [volume, setVolume] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [grid, setGrid] = useState<number[][]>([]);
  const [page, setPage] = useState(0);
  const [panelW, setPanelW] = useState(0);
  const shown = useUi((s) => s.volumeMuscles);
  const onboarded = useUi((s) => s.onboarded);
  const toggle = useUi((s) => s.toggleVolumeMuscle);

  useFocusEffect(
    useCallback(() => {
      listRoutines().then(setRoutines);
      recentSessions().then(setRecent);
      setsSince(weekStart()).then((rows) => setVolume(weeklyVolume(rows)));
      allSessions().then((rows) => setGrid(sessionGrid(rows.map((r) => r.start_time))));
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

  if (!onboarded) return <Redirect href="/welcome" />;
  const nextId = upNext(routines)[0]?.id;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>ETHOS</Doto>
        <Label>{today}</Label>
      </View>

      <View onLayout={(e) => setPanelW(e.nativeEvent.layout.width)}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (panelW + 32)))}
          style={{ marginHorizontal: -16 }}
          contentContainerStyle={{ alignItems: 'stretch' }}
        >
          <View style={{ width: panelW + 32, paddingHorizontal: 16 }}><View style={[s.panel, { flex: 1, backgroundColor: t.card, borderColor: t.line }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label>This week · hard sets</Label>
              <Pressable onPress={() => setEditing((v) => !v)} hitSlop={12}><Label color={editing ? t.accent : t.green}>{editing ? 'Done' : '10–20 band'}</Label></Pressable>
            </View>
            <DotBars items={MUSCLES.filter(([, key]) => shown.includes(key)).map(([label, key]) => ({ label, full: FULL[key], value: volume[key] ?? 0 }))} />
            {editing && (
              <View style={s.chips}>
                {MUSCLES.map(([label, key]) => {
                  const on = shown.includes(key);
                  return (
                    <Pressable key={key} onPress={() => toggle(key)} style={[s.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent' }]}>
                      <Label color={on ? t.bg : t.mute}>{FULL[key]}</Label>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View></View>

          <View style={{ width: panelW + 32, paddingHorizontal: 16 }}><View style={[s.panel, { flex: 1, backgroundColor: t.card, borderColor: t.line }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Label>Training days · 6 weeks</Label>
              <Label color={t.green}>{grid[grid.length - 1]?.filter(Boolean).length ?? 0} this week</Label>
            </View>
            <View style={{ gap: 8 }}>
              <View style={s.gridRow}>
                <Label color={t.dim} style={{ width: 44 }} />
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Label key={i} color={t.dim} style={s.gridCell}>{d}</Label>)}
              </View>
              {grid.map((week, wi) => {
                const last = wi === grid.length - 1;
                return (
                  <View key={wi} style={s.gridRow}>
                    <Label color={last ? t.text : t.dim} style={{ width: 44 }}>{last ? 'now' : `-${grid.length - 1 - wi}w`}</Label>
                    {week.map((n, di) => {
                      const future = last && di > (new Date().getDay() + 6) % 7;
                      return (
                        <View key={di} style={s.gridCell}>
                          <View style={{ width: n ? 10 : 5, height: n ? 10 : 5, borderRadius: 5, backgroundColor: n ? t.green : future ? 'transparent' : t.dim, borderWidth: future ? 1 : 0, borderColor: t.line }} />
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </View></View>
        </ScrollView>
        <View style={s.pageDots}>
          {[0, 1].map((i) => <View key={i} style={{ width: i === page ? 14 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? t.accent : t.dim }} />)}
        </View>
      </View>

      <View style={[s.section, { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <Label>Routines</Label>
        <Pressable onPress={() => router.push('/routines')} hitSlop={12}><Label color={t.accent}>Edit</Label></Pressable>
      </View>
      {routines.length === 0 && <Label color={t.dim} style={{ paddingHorizontal: 4 }}>No routines. Tap Edit to build one.</Label>}
      {[...new Set(routines.map((r) => r.plan))].map((plan) => (
        <View key={plan || '~'} style={[s.card, { backgroundColor: t.card, borderColor: t.line }]}>
          {plan !== '' && <Doto size={28} style={{ paddingBottom: 6 }}>{plan.toUpperCase()}</Doto>}
          {routines.filter((r) => r.plan === plan).map((r) => {
            const ago = daysAgo(r.last_done);
            const next = r.id === nextId;
            return (
              <Pressable key={r.id} onPress={() => go(r)} style={({ pressed }) => [s.day, { borderColor: next ? t.accent : t.line, opacity: pressed ? 0.8 : 1 }]}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Doto size={plan ? 20 : 26}>{r.name.toUpperCase()}</Doto>
                  <Label color={next ? t.accent : t.dim}>{next ? 'Up next · ' : ''}{ago === null ? 'never done' : ago === 0 ? 'today' : `${ago}d ago`}</Label>
                </View>
                <Label color={t.accent}>{active ? 'Resume' : 'Preview'}</Label>
              </Pressable>
            );
          })}
        </View>
      ))}

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
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, minHeight: 56 },
  panel: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  pageDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 10 },
  gridRow: { flexDirection: 'row', alignItems: 'center' },
  gridCell: { flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 44 },
});
