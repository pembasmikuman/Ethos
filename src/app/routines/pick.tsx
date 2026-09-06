import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addRoutineExercise, allExercises, replaceRoutineExercise, routineExerciseRows } from '../../db/queries';
import type { Exercise } from '../../db';
import { fonts, useTheme } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';
import { useWorkout } from '../../store/workout';

export default function PickExercise() {
  const { routine, replace, session } = useLocalSearchParams<{ routine?: string; replace?: string; session?: 'add' | 'swap' }>();
  const addToSession = useWorkout((s) => s.addExercise);
  const blocks = useWorkout((s) => s.blocks);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Exercise[]>([]);
  const [have, setHave] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');

  useEffect(() => {
    allExercises().then(setAll);
    if (routine) routineExerciseRows(routine).then((rows) => setHave(new Set(rows.map((r) => r.id))));
    else setHave(new Set(blocks.map((b) => b.exercise.id)));
  }, [routine]);

  const pick = async (e: Exercise) => {
    if (session) await addToSession(e, session === 'swap');
    else if (replace) await replaceRoutineExercise(replace, e.id);
    else if (routine) await addRoutineExercise(routine, e.id);
    router.back();
  };

  const needle = q.trim().toLowerCase();
  const list = all.filter((e) => !have.has(e.id) && (!needle || e.name.toLowerCase().includes(needle) || e.primary_muscle.includes(needle)));

  let lastMuscle = '';
  return (
    <ScrollView style={{ backgroundColor: t.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={32}>{replace || session === 'swap' ? 'SWAP WITH' : 'ADD EXERCISE'}</Doto>
        <Pressable onPress={() => router.back()} hitSlop={12}><Label color={t.accent}>Cancel</Label></Pressable>
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="search" placeholderTextColor={t.dim} autoCorrect={false} style={[s.search, { color: t.text, borderColor: t.line, backgroundColor: t.card }]} />
      {list.map((e) => {
        const header = e.primary_muscle !== lastMuscle ? e.primary_muscle : null;
        lastMuscle = e.primary_muscle;
        return (
          <View key={e.id}>
            {header && <Label style={s.section}>{header}</Label>}
            <Pressable onPress={() => pick(e)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
              <Doto size={20} style={{ flex: 1 }}>{e.name.toUpperCase()}</Doto>
              <Label color={t.dim}>{e.equipment}</Label>
            </Pressable>
          </View>
        );
      })}
      {routine && <Pressable onPress={() => router.push(`/exercise/new?routine=${routine}`)} style={({ pressed }) => [s.add, { borderColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
        <Label color={t.accent}>+ New exercise</Label>
      </Pressable>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 12 },
  search: { fontFamily: fonts.mono, fontSize: 14, padding: 12, borderWidth: 1, borderRadius: 10 },
  section: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 4 },
  add: { marginTop: 16, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 18, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 52 },
});
