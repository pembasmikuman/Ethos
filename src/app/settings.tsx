import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { backupSummary, exportBackup, pickBackup, restoreBackup } from '../lib/backup';
import { tapHaptic } from '../lib/rest';
import { Doto, Label } from '../components/Text';
import { DOCK_HEIGHT } from '../components/Dock';

export default function Settings() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    if (busy) return;
    setBusy(label);
    setNote(null);
    try {
      const msg = await fn();
      if (msg) setNote(msg);
    } catch (e) {
      Alert.alert('Failed', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = () =>
    run('restore', async () => {
      const b = await pickBackup();
      if (!b) return;
      return new Promise<string>((resolve) => {
        Alert.alert('Replace everything?', `${backupSummary(b)}\n\nCurrent data is deleted first. Export a backup before this if unsure.`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          { text: 'Replace', style: 'destructive', onPress: async () => { await restoreBackup(b); resolve('Restored'); } },
        ]);
      });
    });

  const row = (title: string, sub: string, onPress: () => void, danger = false) => (
    <Pressable
      onPressIn={tapHaptic}
      onPress={onPress}
      disabled={busy !== null}
      style={({ pressed }) => [s.row, { backgroundColor: t.card, borderColor: t.line, opacity: pressed || busy ? 0.7 : 1 }]}
    >
      <View style={{ gap: 4, flex: 1 }}>
        <Doto size={22} color={danger ? t.accent : t.text}>{title}</Doto>
        <Label>{sub}</Label>
      </View>
    </Pressable>
  );

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <Doto size={40}>SETTINGS</Doto>
      <Label style={s.section}>Backup</Label>
      {row('EXPORT', 'Save a JSON snapshot to Files or iCloud Drive', () => run('export', exportBackup))}
      {row('RESTORE', 'Pick a backup file. Replaces all current data.', onRestore, true)}
      {note && <Label color={t.green} style={{ paddingHorizontal: 4 }}>{note}</Label>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16, gap: 8 },
  section: { paddingHorizontal: 4, paddingTop: 16, paddingBottom: 4 },
  row: { padding: 16, borderRadius: 16, borderWidth: 1, minHeight: 64 },
});
