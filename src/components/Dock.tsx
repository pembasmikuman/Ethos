import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

const ITEM_W = 72;
const PAD = 6;
export const DOCK_HEIGHT = 76;

// Apple-style: critically damped for a tap, a touch of bounce only after a flick.
const SNAP = { damping: 26, stiffness: 320, mass: 1 };
const THROW = { damping: 18, stiffness: 260, mass: 1 };

function project(velocity: number, rate = 0.99): number {
  'worklet';
  return ((velocity / 1000) * rate) / (1 - rate);
}

function rubberband(over: number, dim: number, c = 0.55): number {
  'worklet';
  return (over * dim * c) / (dim + c * Math.abs(over));
}

export function Dock() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const active = useWorkout((s) => s.sessionId !== null);
  const rest = useWorkout((s) => s.rest);
  const startedAt = useWorkout((s) => s.startedAt);
  const [now, setNow] = useState(Date.now());

  const selected = path === '/workout' || path === '/rest' ? 1 : 0;
  const x = useSharedValue(selected * ITEM_W);
  const startX = useSharedValue(0);
  const dragging = useSharedValue(false);
  const maxX = (ITEMS.length - 1) * ITEM_W;

  useEffect(() => {
    x.value = withSpring(selected * ITEM_W, SNAP);
  }, [selected]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const go = (i: number) => {
    if (i === selected) return;
    tapHaptic();
    if (i === 0) router.dismissTo('/');
    else router.push('/workout');
  };

  const enabled = (i: number) => i === 0 || active;

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => {
      dragging.value = true;
      startX.value = x.value;
    })
    .onUpdate((e) => {
      const raw = startX.value + e.translationX;
      if (raw < 0) x.value = rubberband(raw, ITEM_W);
      else if (raw > maxX) x.value = maxX + rubberband(raw - maxX, ITEM_W);
      else x.value = raw;
    })
    .onEnd((e) => {
      dragging.value = false;
      const landing = x.value + project(e.velocityX);
      let i = Math.round(Math.min(maxX, Math.max(0, landing)) / ITEM_W);
      if (i === 1 && !active) i = 0;
      x.value = withSpring(i * ITEM_W, { ...(Math.abs(e.velocityX) > 300 ? THROW : SNAP), velocity: e.velocityX });
      runOnJS(go)(i);
    })
    .onFinalize(() => {
      dragging.value = false;
    });

  const highlight = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scale: withSpring(dragging.value ? 1.08 : 1, SNAP) }],
    opacity: withSpring(dragging.value ? 0.9 : 1, SNAP),
  }));

  const restLeft = rest ? Math.round((rest.endsAt - now) / 1000) : 0;
  const status = !active ? null : restLeft > 0 ? fmtClock(restLeft) : fmtClock((now - startedAt) / 1000);
  const glass = scheme === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)';

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: insets.bottom + 10 }]}>
      <GestureDetector gesture={pan}>
        <BlurView intensity={40} tint={scheme === 'light' ? 'light' : 'dark'} style={[s.pill, { borderColor: t.line }]}>
          <Animated.View style={[s.highlight, { backgroundColor: glass, borderColor: t.line }, highlight]} />
          {ITEMS.map((it, i) => {
            const on = i === selected;
            const ink = !enabled(i) ? t.dim : on ? t.accent : t.text;
            return (
              <Pressable key={it.key} disabled={!enabled(i) || on} onPress={() => go(i)} style={s.item}>
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
      </GestureDetector>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', borderRadius: 28, borderWidth: 1, overflow: 'hidden', paddingHorizontal: PAD },
  highlight: { position: 'absolute', left: PAD, top: 4, width: ITEM_W, height: 48, borderRadius: 24, borderWidth: 1 },
  item: { width: ITEM_W, height: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
