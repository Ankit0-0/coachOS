import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextType =
  | 'default'
  | 'title'
  | 'display'
  | 'subtitle'
  | 'heading'
  | 'small'
  | 'smallBold'
  | 'label'
  | 'meta'
  | 'numeric'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

function defaultColorFor(type: ThemedTextType): ThemeColor {
  if (type === 'linkPrimary') return 'accent';
  if (type === 'meta') return 'textMuted';
  return 'text';
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? defaultColorFor(type)] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'display' && styles.display,
        type === 'subtitle' && styles.subtitle,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'label' && styles.label,
        type === 'meta' && styles.meta,
        type === 'numeric' && styles.numeric,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  /** Screen title. Sized so screens no longer override fontSize inline. */
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 700,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: 600,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 600,
    letterSpacing: -0.4,
  },
  /** Card and section titles — the missing step between subtitle and body. */
  heading: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: 700,
    letterSpacing: -0.2,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  /** Field labels above or beside a value. */
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
  },
  /** Timestamps, units, hints — the quietest tier. */
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  /**
   * Figures a coach reads at a glance — client counts, weights, durations.
   * Tabular so columns of numbers line up instead of jittering.
   */
  numeric: {
    fontFamily: Fonts.mono,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
