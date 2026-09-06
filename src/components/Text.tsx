import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { fonts, useTheme } from '../lib/theme';

type Props = TextProps & { color?: string; size?: number };

/** Dot-matrix numerals and titles. */
export function Doto({ style, color, size = 26, ...rest }: Props) {
  const t = useTheme();
  const base: TextStyle = { fontFamily: fonts.doto, fontSize: size, color: color ?? t.text, fontVariant: ['tabular-nums'] };
  return <RNText {...rest} style={[base, style]} />;
}

/** Small uppercase mono label. */
export function Label({ style, color, size = 11, ...rest }: Props) {
  const t = useTheme();
  const base: TextStyle = {
    fontFamily: fonts.mono,
    fontSize: size,
    letterSpacing: size * 0.08,
    textTransform: 'uppercase',
    color: color ?? t.mute,
  };
  return <RNText {...rest} style={[base, style]} />;
}
