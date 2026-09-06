import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { fmtClock } from '../lib/format';
import { tapHaptic } from '../lib/rest';
import { useWorkout } from '../store/workout';
import { Doto, Label } from './Text';

const ICONS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  log: 'M2 10h2v4H2zM20 10h2v4h-2zM5 8h2v8H5zM17 8h2v8h-2zM7 12h10',
};

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'log', label: 'Log', href: '/workout' },
];

export function Dock() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const active = useWorkout((s) => s.sessionId !== null);
  const rest = useWorkout((s) => s.rest);
  const startedAt = useWorkout((s) => s.startedAt);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const restLeft = rest ? Math.round((rest.endsAt - now) / 1000) : 0;
  const status = !active ? null : restLeft > 0 ? fmtClock(restLeft) : fmtClock((now - startedAt) / 1000);

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: insets.bottom + 10 }]}>
      <BlurView intensity={40} tint={scheme === 'light' ? 'light' : 'dark'} style={[s.pill, { borderColor: t.line }]}>
        {ITEMS.map((it) => {
          const on = path === it.href || (it.href === '/workout' && path === '/rest');
          const disabled = it.href === '/workout' && !active;
          const ink = disabled ? t.dim : on ? t.accent : t.text;
          return (
            <Pressable
              key={it.key}
              disabled={disabled || on}
              onPressIn={tapHaptic}
              onPress={() => (it.href === '/' ? router.dismissTo('/') : router.push(it.href as never))}
              style={({ pressed }) => [s.item, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d={ICONS[it.key]} stroke={ink} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              {it.key === 'log' && status ? (
                <Doto size={12} color={restLeft > 0 ? t.accent : ink}>{status}</Doto>
              ) : (
                <Label size={9} color={ink}>{it.label}</Label>
              )}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

export const DOCK_HEIGHT = 76;

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', borderRadius: 28, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 6 },
  item: { width: 72, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
