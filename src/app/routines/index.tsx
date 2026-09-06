import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createRoutine, deleteRoutine, listRoutines, type Routine } from '../../db/queries';
import { useTheme } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';

export default function Routines() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<Routine[]>([]);

  const load = () => listRoutines().then(setRows);
  useFocusEffect(useCallback(() => { load(); }, []));

  const add = async () => {
    const id = await createRoutine('New routine');
    router.push(`/routines/${id}`);
  };

  const confirmDelete = (r: Routine) =>
    Alert.alert('Delete routine?', `${r.name}. Past sessions stay in history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRoutine(r.id); load(); } },
    ]);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>ROUTINES</Doto>
        <Pressable onPress={() => router.back()} hitSlop={12}><Label color={t.accent}>Done</Label></Pressable>
      </View>
      <Label color={t.dim} style={{ paddingHorizontal: 4, paddingBottom: 6 }}>Tap to edit · hold to delete</Label>
      {rows.map((r) => (
        <Pressable key={r.id} onPress={() => router.push(`/routines/${r.id}`)} onLongPress={() => confirmDelete(r)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
          <Doto size={22} style={{ flex: 1 }}>{r.name.toUpperCase()}</Doto>
          <Label>{r.exercises} ex</Label>
          <Label color={t.dim}>›</Label>
        </Pressable>
      ))}
      <Pressable onPress={add} style={({ pressed }) => [s.add, { borderColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
        <Label color={t.accent}>+ New routine</Label>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 56 },
  add: { marginTop: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center' },
});
