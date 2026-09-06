import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Exercise } from '../../db';
import { deleteExercise, duplicateExercise, exerciseById, exerciseHistory, updateExercise, type ExerciseSettings } from '../../db/queries';
import { epley1RM } from '../../lib/progression';
import { fmtKg } from '../../lib/format';
import { tapHaptic } from '../../lib/rest';
import { useTheme, useTopInset } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DotTrend } from '../../components/DotTrend';
import { DOCK_HEIGHT } from '../../components/Dock';

type Hist = Awaited<ReturnType<typeof exerciseHistory>>;

function Stepper({ label, value, onChange }: { label: string; value: string; onChange: (d: -1 | 1) => void }) {
  const t = useTheme();
  const tap = (d: -1 | 1) => { tapHaptic(); onChange(d); };
  return (
    <View style={[s.setting, { borderBottomColor: t.line }]}>
      <Label style={{ flex: 1 }}>{label}</Label>
      <Pressable onPress={() => tap(-1)} hitSlop={8} style={s.key}><Doto size={20} color={t.mute}>−</Doto></Pressable>
      <Doto size={22} style={{ minWidth: 64, textAlign: 'center' }}>{value}</Doto>
      <Pressable onPress={() => tap(1)} hitSlop={8} style={s.key}><Doto size={20} color={t.mute}>+</Doto></Pressable>
    </View>
  );
}

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const [ex, setEx] = useState<Exercise | null>(null);
  const [hist, setHist] = useState<Hist>([]);

  useFocusEffect(useCallback(() => {
    exerciseById(id).then(setEx);
    exerciseHistory(id).then(setHist);
  }, [id]));

  if (!ex) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const patch = (p: Partial<ExerciseSettings>) => {
    const next = { ...ex, ...p };
    setEx(next);
    updateExercise(id, next);
  };

  const onMenu = () =>
    Alert.alert(ex.name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit name · brand · muscle', onPress: () => router.push(`/exercise/new?edit=${id}`) },
      { text: 'Duplicate as variant', onPress: async () => { const nid = await duplicateExercise(id); router.push(`/exercise/new?edit=${nid}`); } },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (await deleteExercise(id)) router.back();
          else Alert.alert('Has history', 'Exercises with logged sets stay. Remove it from routines instead.');
        },
      },
    ]);

  const best = hist.map((h) => Math.round(Math.max(...h.sets.map((x) => epley1RM(x.weight, x.reps, x.rir ?? 0))))).reverse();

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Label color={t.accent}>‹ Back</Label></Pressable>
        <Pressable onPress={onMenu} hitSlop={12}><Label color={t.accent}>Edit</Label></Pressable>
      </View>
      <Doto size={32}>{ex.name.toUpperCase()}</Doto>
      {ex.brand !== '' && <Label color={t.accent} style={{ paddingTop: 4 }}>{ex.brand}</Label>}
      <Label style={{ paddingTop: 4 }}>{ex.primary_muscle}{ex.secondary_muscles ? ` · ${ex.secondary_muscles}` : ''} · {ex.equipment}</Label>

      <View style={[s.panel, { backgroundColor: t.card, borderColor: t.line }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Label>Est. 1RM · last {best.length}</Label>
          {best.length > 0 && <Doto size={22} color={t.accent}>{best[best.length - 1]} KG</Doto>}
        </View>
        {best.length > 0 ? <DotTrend values={best} unit="kg" /> : <Label color={t.dim}>No sessions yet.</Label>}
      </View>

      <Label style={s.section}>Settings</Label>
      <Stepper label="Rest" value={`${ex.default_rest_seconds}s`} onChange={(d) => patch({ default_rest_seconds: Math.max(30, ex.default_rest_seconds + d * 15) })} />
      <Stepper label="Increment" value={`${fmtKg(ex.increment_kg)} kg`} onChange={(d) => patch({ increment_kg: Math.max(0.5, ex.increment_kg + d * 0.5) })} />
      <Stepper label="Reps min" value={`${ex.target_rep_min}`} onChange={(d) => patch({ target_rep_min: Math.max(1, Math.min(ex.target_rep_max - 1, ex.target_rep_min + d)) })} />
      <Stepper label="Reps max" value={`${ex.target_rep_max}`} onChange={(d) => patch({ target_rep_max: Math.max(ex.target_rep_min + 1, ex.target_rep_max + d) })} />

      {hist.length > 0 && <Label style={s.section}>History</Label>}
      {hist.map((h) => (
        <Pressable key={h.session_id} onPress={() => router.push(`/history/${h.session_id}`)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
          <Label color={t.dim} style={{ width: 90 }}>{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Label>
          <Doto size={18} style={{ flex: 1 }}>{h.sets.map((x) => `${fmtKg(x.weight)}×${x.reps}`).join('  ')}</Doto>
          <Label color={t.dim}>›</Label>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  panel: { marginTop: 18, borderWidth: 1, borderRadius: 14, padding: 16, gap: 14 },
  section: { paddingHorizontal: 4, paddingTop: 22, paddingBottom: 6 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, borderBottomWidth: 1, height: 56 },
  key: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 1 },
});
