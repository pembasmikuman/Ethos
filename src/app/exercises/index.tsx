import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { allExercises } from '../../db/queries';
import type { Exercise } from '../../db';
import { fonts, useTheme } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';

export default function Exercises() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState<Exercise[]>([]);
  const [q, setQ] = useState('');

  useFocusEffect(useCallback(() => { allExercises().then(setAll); }, []));

  const needle = q.trim().toLowerCase();
  const list = all.filter((e) => !needle || e.name.toLowerCase().includes(needle) || e.primary_muscle.includes(needle));

  let lastMuscle = '';
  return (
    <ScrollView style={{ backgroundColor: t.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={40}>MOVES</Doto>
        <Pressable onPress={() => router.push('/exercise/new')} hitSlop={12}><Label color={t.accent}>+ New</Label></Pressable>
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="search" placeholderTextColor={t.dim} autoCorrect={false} style={[s.search, { color: t.text, borderColor: t.line, backgroundColor: t.card }]} />
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
  section: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 52 },
});
