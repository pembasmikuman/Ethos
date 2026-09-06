import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { Label } from './Text';

type Props = { items: { label: string; value: number }[]; max?: number; band?: [number, number] };

/** Dot columns. Rows in `band` tint green. */
export function DotBars({ items, max = 20, band = [10, 20] }: Props) {
  const t = useTheme();
  const rows = 10, dot = 4, gap = 2, colW = 22;
  const h = rows * (dot * 2 + gap);
  const perRow = max / rows;
  return (
    <View style={s.wrap}>
      {items.map((it) => {
        const lit = Math.round(it.value / perRow);
        return (
          <View key={it.label} style={s.col}>
            <Svg width={colW} height={h}>
              {Array.from({ length: rows }, (_, r) => {
                const on = r < lit;
                const inBand = (r + 1) * perRow > band[0] - 0.01 && (r + 1) * perRow <= band[1];
                const fill = on ? (inBand ? t.green : t.text) : inBand ? t.line : t.dim;
                return <Circle key={r} cx={colW / 2} cy={h - dot - r * (dot * 2 + gap)} r={on ? dot : dot / 2} fill={fill} />;
              })}
            </Svg>
            <Label size={9}>{it.label}</Label>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  col: { alignItems: 'center', gap: 8 },
});
