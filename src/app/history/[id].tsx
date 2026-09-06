import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sessionById, sessionSets, type SessionRow } from '../../db/queries';
import { useTheme } from '../../lib/theme';
import { fmtKg } from '../../lib/format';
import { epley1RM } from '../../lib/progression';
import { Doto, Label } from '../../components/Text';
import { DOCK_HEIGHT } from '../../components/Dock';
import { sessionMeta } from './index';

type SetRow = Awaited<ReturnType<typeof sessionSets>>[number];

export default function SessionDetail() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);

  useEffect(() => {
    sessionById(id).then(setSession);
    sessionSets(id).then(setSets);
  }, [id]);

  if (!session) return null;
  const { date, mins } = sessionMeta(session);

  const groups: { name: string; target: number; sets: SetRow[] }[] = [];
  for (const s of sets) {
    let g = groups.find((x) => x.name === s.name);
    if (!g) groups.push((g = { name: s.name, target: s.target_rep_max, sets: [] }));
    g.sets.push(s);
  }

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[st.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}>
        <Label color={t.text}>‹ History</Label>
      </Pressable>
      <View style={st.head}>
        <Doto size={34}>{session.title.toUpperCase()}</Doto>
        <Label>{date} · {mins} min · {session.sets} sets · {fmtKg(Math.round(session.volume_kg))} kg</Label>
      </View>

      {groups.map((g) => {
        const best = Math.max(...g.sets.filter((x) => x.set_type === 'working').map((x) => epley1RM(x.weight, x.reps, x.rir)), 0);
        let n = 0;
        return (
          <View key={g.name} style={[st.card, { backgroundColor: t.card, borderColor: t.line }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Doto size={20} style={{ flex: 1 }}>{g.name.toUpperCase()}</Doto>
              {best > 0 && <Label color={t.dim}>e1RM {fmtKg(Math.round(best * 2) / 2)}</Label>}
            </View>
            {g.sets.map((x) => {
              const warm = x.set_type === 'warmup';
              if (!warm) n += 1;
              const hit = !warm && x.reps >= g.target && (x.rir ?? 0) >= 1;
              return (
                <View key={x.id} style={st.set}>
                  <Label color={warm ? t.warm : t.mute} style={{ width: 26 }}>{warm ? 'W' : String(n)}</Label>
                  <Doto size={22} color={warm ? t.mute : t.text}>{fmtKg(x.weight)}</Doto><Label color={t.dim}>kg</Label>
                  <Doto size={22} color={warm ? t.mute : hit ? t.green : t.text}>{x.reps}</Doto><Label color={t.dim}>reps</Label>
                  {x.rir != null && (<><Doto size={22} color={t.mute}>{x.rir}</Doto><Label color={t.dim}>rir</Label></>)}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 10 },
  head: { gap: 6, paddingHorizontal: 4, paddingBottom: 6 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  set: { flexDirection: 'row', alignItems: 'baseline', gap: 10, minHeight: 36 },
});
