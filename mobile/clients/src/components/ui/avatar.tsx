import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
};

/** First letters of the first and last word, e.g. "Test Coach One" -> "TO". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const DIMENSIONS = {
  sm: { box: 36, font: 13 },
  md: { box: 52, font: 18 },
  lg: { box: 84, font: 30 },
} as const;

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const theme = useTheme();
  const { box, font } = DIMENSIONS[size];

  return (
    <View
      style={[
        styles.circle,
        { width: box, height: box, borderRadius: Radii.pill, backgroundColor: theme.accent },
      ]}>
      <ThemedText themeColor="onAccent" style={[styles.initials, { fontSize: font }]}>
        {initialsOf(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: 700,
    letterSpacing: 0.5,
  },
});
