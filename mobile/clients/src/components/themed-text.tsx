import { StyleSheet, Text, type TextProps } from 'react-native';

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
    fontFamily: Fonts.sansBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: Fonts.sansBold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  /** Card and section titles — the missing step between subtitle and body. */
  heading: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Field labels above or beside a value. */
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Timestamps, units, hints — the quietest tier. */
  meta: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  /**
   * Figures a coach reads at a glance — client counts, weights, durations.
   * Tabular so columns of numbers line up instead of jittering.
   */
  numeric: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  link: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  linkPrimary: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
