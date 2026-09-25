import { StyleSheet, Text, View, type TextProps, type ViewProps } from 'react-native';

import { useTheme } from '../provider';
import type { ThemeColor } from '../themes';
import { Fonts, Type } from '../tokens';

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
  | 'chip'
  | 'numeric'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextType;
  themeColor?: ThemeColor;
};

function defaultColorFor(type: ThemedTextType): ThemeColor {
  switch (type) {
    case 'display':
    case 'title':
    case 'subtitle':
    case 'heading':
      return 'textHeading';
    case 'linkPrimary':
      return 'primary';
    case 'meta':
      return 'textMuted';
    default:
      return 'textPrimary';
  }
}

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? defaultColorFor(type)] }, styles[type], style]} {...rest} />;
}

export type ThemedViewProps = ViewProps & {
  type?: ThemeColor;
};

export function ThemedView({ style, type, ...rest }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[type ?? 'bg'] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: Type.display,
  title: Type.title,
  subtitle: Type.subtitle,
  heading: Type.heading,
  default: Type.body,
  small: Type.small,
  smallBold: Type.smallBold,
  label: Type.label,
  meta: Type.meta,
  chip: Type.chip,
  numeric: Type.numeric,
  link: { fontFamily: Fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  linkPrimary: { fontFamily: Fonts.sansSemibold, fontSize: 14, lineHeight: 20 },
  code: { fontFamily: Fonts.mono, fontSize: 12 },
});
