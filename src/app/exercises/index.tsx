import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allExercises } from '../../db/queries';
import type { Exercise } from '../../db';
import { fonts, useTheme } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';

const MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'delts', 'biceps', 'triceps', 'calves', 'abs'];
const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'];

export default function Exercises() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Exercise[]>([]);
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [gear, setGear] = useState('');

  useFocusEffect(useCallback(() => { allExercises().then(setAll); }, []));

  const needle = q.trim().toLowerCase();
  const list = all.filter((e) => (!muscle || e.primary_muscle === muscle) && (!gear || e.equipment === gear) && (!needle || e.name.toLowerCase().includes(needle)));
  const chips = (options: string[], value: string, set: (v: string) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
      {['all', ...options].map((o) => {
        const on = (o === 'all' ? '' : o) === value;
        return (
          <Pressable key={o} onPress={() => set(o === 'all' ? '' : o)} style={[s.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.card }]}>
            <Label color={on ? t.bg : t.mute}>{o}</Label>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  let lastMuscle = '';
  return (
    <ScrollView style={{ backgroundColor: t.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>MOVES</Doto>
        <Label>{list.length} of {all.length}</Label>
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="search" placeholderTextColor={t.dim} autoCorrect={false} style={[s.search, { color: t.text, borderColor: t.line, backgroundColor: t.card }]} />
      {chips(MUSCLES, muscle, setMuscle)}
      {chips(EQUIPMENT, gear, setGear)}
      {list.map((e) => {
        const header = e.primary_muscle !== lastMuscle ? e.primary_muscle : null;
        lastMuscle = e.primary_muscle;
        return (
          <View key={e.id}>
            {header && <Label style={s.section}>{header}</Label>}
            <Pressable onPress={() => router.push(`/exercise/${e.id}`)} style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed ? 0.7 : 1 }]}>
              <Doto size={20} style={{ flex: 1 }}>{e.name.toUpperCase()}</Doto>
              <Label color={t.dim}>{e.equipment}</Label>
              <Label color={t.dim}>›</Label>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 12 },
  search: { fontFamily: fonts.mono, fontSize: 14, padding: 12, borderWidth: 1, borderRadius: 10 },
  chips: { flexDirection: 'row', gap: 8, paddingTop: 10, paddingHorizontal: 2 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  section: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 52 },
});
