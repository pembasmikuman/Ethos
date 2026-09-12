import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useTopInset } from '../lib/theme';
import { scheduleRestDone, systemTones, tapHaptic, useSystemTone, type Tone } from '../lib/rest';
import { Doto, Label } from '../components/Text';
import { DOCK_HEIGHT } from '../components/Dock';
import { useUi } from '../store/ui';

/** Rest alert sound: the device's own alert tones and ringtones, or the system default. */
export default function Sounds() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const top = useTopInset();
  const restSound = useUi((s) => s.restSound);
  const setRestSound = useUi((s) => s.setRestSound);
  const customSoundLabel = useUi((s) => s.customSoundLabel);
  const [busy, setBusy] = useState(false);

  // Listing walks two directories, so do it once rather than on every render.
  const tones = useMemo(systemTones, []);
  const alerts = tones.filter((x) => x.kind === 'alert');
  const ringtones = tones.filter((x) => x.kind === 'ringtone');

  const choose = async (tone: Tone) => {
    if (busy) return;
    setBusy(true);
    try {
      await useSystemTone(tone);
      // Ring it straight away, which is the only real check that iOS can play it.
      await scheduleRestDone(2, tone.label);
    } catch (e) {
      Alert.alert('Could not use that tone', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const row = (name: string, on: boolean, onPress: () => void, sub?: string) => (
    <Pressable
      key={name}
      onPressIn={tapHaptic}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [s.row, { borderBottomColor: t.line, opacity: pressed || busy ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Doto size={18} color={on ? t.accent : t.text}>{name.toUpperCase()}</Doto>
        {sub && <Label color={t.dim}>{sub}</Label>}
      </View>
      <Label color={on ? t.accent : t.dim}>{on ? '●' : '○'}</Label>
    </Pressable>
  );

  const isTone = (label: string) => restSound === 'custom' && customSoundLabel === label;

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={[s.page, { paddingTop: top + 12, paddingBottom: insets.bottom + DOCK_HEIGHT + 12 }]}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}>
        <Label color={t.text}>‹ Settings</Label>
      </Pressable>
      <Doto size={34}>REST SOUND</Doto>
      <Label color={t.dim} style={{ paddingHorizontal: 4, paddingBottom: 8 }}>Tap one and it rings in 2 seconds. If you hear the plain iPhone alert instead, iOS cannot play that file.</Label>

      {row('System default', restSound === 'system', () => setRestSound('system'))}

      {alerts.length > 0 && <Label style={s.section}>Alert tones</Label>}
      {alerts.map((x) => row(x.label, isTone(x.label), () => choose(x)))}

      {ringtones.length > 0 && <Label style={s.section}>Ringtones</Label>}
      {ringtones.length > 0 && (
        <Label color={t.dim} style={{ paddingHorizontal: 4, paddingBottom: 6 }}>
          These are m4r files. Notifications officially play wav, aiff and caf only, so some or all of these may fall back to the plain alert.
        </Label>
      )}
      {ringtones.map((x) => row(x.label, isTone(x.label), () => choose(x)))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: 16 },
  section: { paddingHorizontal: 4, paddingTop: 20, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, borderBottomWidth: 1, minHeight: 56 },
});
