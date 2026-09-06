import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteSession, deleteSet, sessionById, sessionSets, updateSet, type SessionRow } from '../../db/queries';
import { useTheme, useTopInset } from '../../lib/theme';
import { applyKey, fmtKg } from '../../lib/format';
import { epley1RM } from '../../lib/progression';
import { doneHaptic } from '../../lib/rest';
import { Doto, Label } from '../../components/Text';
import { Numpad } from '../../components/Numpad';
import { DOCK_HEIGHT } from '../../components/Dock';
import { sessionMeta } from './index';
import { useUi } from '../../store/ui';

type SetRow = Awaited<ReturnType<typeof sessionSets>>[number];
type Field = 'weight' | 'reps' | 'rir';
type Edit = { id: string; field: Field; weight: string; reps: string; rir: string };

export default function SessionDetail() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [edit, setEdit] = useState<Edit | null>(null);

  const load = () => {
    sessionById(id).then(setSession);
    sessionSets(id).then(setSets);
  };
  useEffect(load, [id]);

  const setDockHidden = useUi((s) => s.setDockHidden);
  useEffect(() => {
    setDockHidden(edit !== null);
    return () => setDockHidden(false);
  }, [edit !== null]);

  if (!session) return null;
  const { date, mins } = sessionMeta(session);

  const groups: { name: string; exercise_id: string; target: number; sets: SetRow[] }[] = [];
  for (const s of sets) {
    let g = groups.find((x) => x.name === s.name);
    if (!g) groups.push((g = { name: s.name, exercise_id: s.exercise_id, target: s.target_rep_max, sets: [] }));
    g.sets.push(s);
  }

  const beginEdit = (x: SetRow, field: Field) =>
    setEdit({ id: x.id, field, weight: fmtKg(x.weight), reps: String(x.reps), rir: x.rir == null ? '' : String(x.rir) });

  const onKey = (k: string) => {
    if (!edit) return;
    if ((k === '+' || k === '-' || k === '.') && edit.field !== 'weight') return;
    setEdit({ ...edit, [edit.field]: applyKey(edit[edit.field], k, edit.field === 'weight' ? 5 : 2) });
  };

  const nextField = (): Field | null => {
    if (!edit) return null;
    const warm = sets.find((x) => x.id === edit.id)?.set_type === 'warmup';
    if (edit.field === 'weight') return 'reps';
    if (edit.field === 'reps' && !warm) return 'rir';
    return null;
  };

  const onDone = async () => {
    if (!edit) return;
    const nf = nextField();
    if (nf) return setEdit({ ...edit, field: nf });
    const weight = parseFloat(edit.weight);
    const reps = parseInt(edit.reps, 10);
    if (Number.isNaN(weight) || Number.isNaN(reps)) return;
    await updateSet(edit.id, weight, reps, edit.rir === '' ? null : parseInt(edit.rir, 10));
    doneHaptic();
    setEdit(null);
    load();
  };

  const confirmDeleteSet = (x: SetRow) =>
    Alert.alert('Delete set?', `${x.name} · ${fmtKg(x.weight)} kg × ${x.reps}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSet(x.id); setEdit(null); load(); } },
    ]);

  const confirmDeleteSession = () =>
    Alert.alert('Delete session?', `Removes all ${session.sets} sets.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteSession(session.id); router.back(); } },
    ]);

  const cell = (x: SetRow, field: Field, value: string, unit: string, color: string) => {
    const on = edit?.id === x.id && edit.field === field;
    const shown = edit?.id === x.id ? edit[field] || '–' : value;
    return (
      <Pressable onPress={() => (edit?.id === x.id ? setEdit({ ...edit, field }) : beginEdit(x, field))} style={st.cell} hitSlop={6}>
        <Doto size={22} color={on ? t.accent : color}>{shown}</Doto><Label color={t.dim}>{unit}</Label>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={[st.page, { paddingTop: top + 12, paddingBottom: (edit ? 12 : insets.bottom + DOCK_HEIGHT + 12) }]}>
        <Pressable onPress={() => edit && setEdit(null)} style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}>
          <Label color={t.text}>‹ History</Label>
        </Pressable>
        <View style={st.head}>
          <Doto size={34}>{session.title.toUpperCase()}</Doto>
          <Label>{date} · {mins} min · {session.sets} sets · {fmtKg(Math.round(session.volume_kg))} kg</Label>
          <Label color={t.dim}>Tap a number to edit · hold a set to delete</Label>
        </View>

        {groups.map((g) => {
          const best = Math.max(...g.sets.filter((x) => x.set_type === 'working').map((x) => epley1RM(x.weight, x.reps, x.rir)), 0);
          let n = 0;
          return (
            <View key={g.name} style={[st.card, { backgroundColor: t.card, borderColor: t.line }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Pressable onPress={() => router.push(`/exercise/${g.exercise_id}`)} hitSlop={8} style={{ flex: 1 }}><Doto size={20}>{g.name.toUpperCase()}</Doto></Pressable>
                {best > 0 && <Label color={t.dim}>e1RM {fmtKg(Math.round(best * 2) / 2)}</Label>}
              </View>
              {g.sets.map((x) => {
                const warm = x.set_type === 'warmup';
                if (!warm) n += 1;
                const hit = !warm && x.reps >= g.target && (x.rir ?? 0) >= 1;
                const editing = edit?.id === x.id;
                return (
                  <Pressable key={x.id} onLongPress={() => confirmDeleteSet(x)} style={[st.set, { borderColor: editing ? t.accent : 'transparent' }]}>
                    <Label color={warm ? t.warm : t.mute} style={{ width: 26 }}>{warm ? 'W' : String(n)}</Label>
                    {cell(x, 'weight', fmtKg(x.weight), 'kg', warm ? t.mute : t.text)}
                    {cell(x, 'reps', String(x.reps), 'reps', warm ? t.mute : hit ? t.green : t.text)}
                    {!warm && cell(x, 'rir', x.rir == null ? '–' : String(x.rir), 'rir', t.mute)}
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <Pressable onPress={confirmDeleteSession} style={[st.danger, { borderColor: t.line }]}>
          <Label color={t.accent}>Delete session</Label>
        </Pressable>
      </ScrollView>

      {edit && (
        <View style={[st.pad, { backgroundColor: t.bg, borderTopColor: t.line, paddingBottom: insets.bottom + 8 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 8 }}>
            <Label>Editing</Label>
            <Pressable onPress={() => setEdit(null)} hitSlop={10}><Label color={t.text}>Cancel</Label></Pressable>
          </View>
          <Numpad onKey={onKey} onDone={onDone} doneLabel={nextField() ? `Next · ${nextField()}` : 'Save'} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 10 },
  head: { gap: 6, paddingHorizontal: 4, paddingBottom: 6 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  set: { flexDirection: 'row', alignItems: 'baseline', gap: 10, minHeight: 44, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1 },
  cell: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingVertical: 8 },
  danger: { alignItems: 'center', justifyContent: 'center', minHeight: 56, borderRadius: 14, borderWidth: 1, marginTop: 8 },
  pad: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1 },
});
