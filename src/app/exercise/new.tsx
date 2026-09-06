import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addRoutineExercise, createExercise, duplicateExercise, exerciseById, renameExercise } from '../../db/queries';
import { fonts, useTheme } from '../../lib/theme';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';

const MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'delts', 'biceps', 'triceps', 'calves', 'abs'];
const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'];

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <View style={s.chips}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[s.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : t.card }]}>
            <Label color={on ? t.bg : t.mute}>{o}</Label>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewExercise() {
  const { routine, edit } = useLocalSearchParams<{ routine?: string; edit?: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [muscle, setMuscle] = useState('chest');
  const [equipment, setEquipment] = useState('barbell');
  const ok = name.trim().length > 0;

  useEffect(() => {
    if (!edit) return;
    exerciseById(edit).then((e) => { if (e) { setName(e.name); setBrand(e.brand); setMuscle(e.primary_muscle); setEquipment(e.equipment ?? 'barbell'); } });
  }, [edit]);

  const save = async () => {
    if (!ok) return;
    if (edit) {
      await renameExercise(edit, name.trim(), brand.trim(), muscle, equipment);
      router.back();
      return;
    }
    const id = await createExercise(name.trim(), brand.trim(), muscle, equipment);
    if (routine) {
      await addRoutineExercise(routine, id);
      router.dismiss(2);
    } else router.replace(`/exercise/${id}`);
  };

  return (
    <ScrollView style={{ backgroundColor: t.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <View style={s.head}>
        <Doto size={32}>{edit ? 'EDIT' : 'NEW EXERCISE'}</Doto>
        <Pressable onPress={() => router.back()} hitSlop={12}><Label color={t.accent}>Cancel</Label></Pressable>
      </View>
      <Label style={s.section}>Name</Label>
      <TextInput value={name} onChangeText={setName} autoFocus placeholder="e.g. Pendlay row" placeholderTextColor={t.dim} style={[s.name, { color: t.text, borderBottomColor: t.line }]} />
      <Label style={s.section}>Brand · machine variant</Label>
      <TextInput value={brand} onChangeText={setBrand} placeholder="e.g. Technogym, Hammer" placeholderTextColor={t.dim} autoCapitalize="words" style={[s.brand, { color: t.text, borderBottomColor: t.line }]} />
      <Label style={s.section}>Primary muscle</Label>
      <Chips options={MUSCLES} value={muscle} onChange={setMuscle} />
      <Label style={s.section}>Equipment</Label>
      <Chips options={EQUIPMENT} value={equipment} onChange={setEquipment} />
      <Pressable onPress={save} disabled={!ok} style={({ pressed }) => [s.save, { backgroundColor: ok ? t.accent : t.card, borderColor: ok ? t.accent : t.line, opacity: pressed ? 0.85 : 1 }]}>
        <Label color={ok ? t.bg : t.dim}>{edit ? 'Save' : 'Save · defaults 120s · 8–12 · 2.5 kg'}</Label>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 4 },
  section: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 8 },
  name: { fontFamily: fonts.doto, fontSize: 28, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1 },
  brand: { fontFamily: fonts.mono, fontSize: 16, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  save: { marginTop: 28, borderWidth: 1, borderRadius: 12, padding: 18, alignItems: 'center' },
});
