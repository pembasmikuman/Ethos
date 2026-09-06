import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { Label } from './Text';

export const ROW_H = 64;
const SNAP = { damping: 26, stiffness: 320, mass: 1 };

/** Shared drag state for one list. */
export function useDragList() {
  return { active: useSharedValue(-1), dy: useSharedValue(0) };
}

type Props = {
  index: number;
  count: number;
  drag: { active: SharedValue<number>; dy: SharedValue<number> };
  onDrop: (from: number, to: number) => void;
  onGrab: () => void;
  children: ReactNode;
};

/** Fixed-height row with a ≡ handle. Hold handle briefly, drag, siblings spring aside. */
export function DragRow({ index, count, drag: { active, dy }, onDrop, onGrab, children }: Props) {
  const clamp = (n: number) => {
    'worklet';
    return Math.max(0, Math.min(count - 1, n));
  };
  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => { active.value = index; dy.value = 0; runOnJS(onGrab)(); })
    .onUpdate((e) => { dy.value = e.translationY; })
    .onFinalize(() => {
      const to = clamp(index + Math.round(dy.value / ROW_H));
      active.value = -1;
      dy.value = 0;
      runOnJS(onDrop)(index, to);
    });
  const style = useAnimatedStyle(() => {
    if (active.value === index) return { transform: [{ translateY: dy.value }, { scale: 1.02 }], zIndex: 10 };
    if (active.value === -1) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0 };
    const target = clamp(active.value + Math.round(dy.value / ROW_H));
    const shift = active.value < index && index <= target ? -ROW_H : target <= index && index < active.value ? ROW_H : 0;
    return { transform: [{ translateY: withSpring(shift, SNAP) }, { scale: 1 }], zIndex: 0 };
  });
  return (
    <Animated.View style={style}>
      {children}
      <GestureDetector gesture={pan}>
        <View style={s.handle}><Label size={16}>≡</Label></View>
      </GestureDetector>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  handle: { position: 'absolute', right: 0, top: 0, width: 44, height: ROW_H, alignItems: 'center', justifyContent: 'center' },
});
