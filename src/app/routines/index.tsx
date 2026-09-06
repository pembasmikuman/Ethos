import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createRoutine, deletePlan, deleteRoutine, listRoutines, renamePlan, type Routine } from '../../db/queries';
import { useTheme, useTopInset } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';

/** Routine = plan (UL, PPL). Each holds days (Day A, Day B) which are the rows in the routines table. */
export default function Routines() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const [rows, setRows] = useState<Routine[]>([]);

  const load = () => listRoutines().then(setRows);
  useFocusEffect(useCallback(() => { load(); }, []));

  const plans = [...new Set(rows.map((r) => r.plan))];

  const newPlan = () =>
    Alert.prompt('New routine', 'Name, e.g. UL or PPL', async (name) => {
      const p = (name ?? '').trim();
      if (!p) return;
      const id = await createRoutine('Day A', p);
      router.push(`/routines/${id}`);
    });

  const planMenu = (plan: string) =>
    Alert.alert(plan || 'Loose days', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rename', onPress: () => Alert.prompt('Rename routine', undefined, async (n) => { if (n?.trim()) { await renamePlan(plan, n.trim()); load(); } }, 'plain-text', plan) },
      { text: 'Delete routine and its days', style: 'destructive', onPress: async () => { await deletePlan(plan); load(); } },
    ]);

  const dayMenu = (r: Routine) =>
    Alert.alert('Delete day?', `${r.name}. Past sessions stay in history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRoutine(r.id); load(); } },
    ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>ROUTINES</Doto>
        <Pressable onPress={() => router.back()} hitSlop={12}><Label color={t.accent}>Done</Label></Pressable>
      </View>
      {rows.length === 0 && <Label color={t.dim} style={{ paddingHorizontal: 4 }}>No routines yet.</Label>}
      {plans.map((plan) => (
        <View key={plan || '~'} style={[s.plan, { backgroundColor: t.card, borderColor: t.line }]}>
          <Pressable onLongPress={() => planMenu(plan)} style={s.planHead}>
            <Doto size={26} style={{ flex: 1 }}>{(plan || 'LOOSE DAYS').toUpperCase()}</Doto>
            <Label color={t.dim}>hold to rename</Label>
          </Pressable>
          {rows.filter((r) => r.plan === plan).map((r) => (
            <Pressable key={r.id} onPress={() => router.push(`/routines/${r.id}`)} onLongPress={() => dayMenu(r)} style={({ pressed }) => [s.row, { borderTopColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
              <Doto size={18} style={{ flex: 1 }}>{r.name.toUpperCase()}</Doto>
              <Label>{r.exercises} ex</Label>
              <Label color={t.dim}>›</Label>
            </Pressable>
          ))}
          <Pressable onPress={async () => { const n = rows.filter((r) => r.plan === plan).length; const id = await createRoutine(`Day ${String.fromCharCode(65 + n)}`, plan); router.push(`/routines/${id}`); }} style={[s.row, { borderTopColor: t.line }]}>
            <Label color={t.accent}>+ Day</Label>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={newPlan} style={({ pressed }) => [s.add, { borderColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
        <Label color={t.accent}>+ New routine</Label>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 4 },
  plan: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, minHeight: 48 },
  add: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center' },
});
