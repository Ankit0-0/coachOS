import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** A signed URL from the API. Initials are shown when it is null or absent. */
  imageUrl?: string | null;
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

export function Avatar({ name, size = 'md', imageUrl }: AvatarProps) {
  const theme = useTheme();
  const { box, font } = DIMENSIONS[size];

  const frame = [
    styles.circle,
    {
      width: box,
      height: box,
      borderRadius: Radii.pill,
      backgroundColor: theme.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
  ];

  // Signed URLs expire, so a stale one can fail to load. Initials stay
  // underneath as the backdrop rather than leaving a blank circle.
  return (
    <View style={frame}>
      <ThemedText themeColor="textSecondary" style={[styles.initials, { fontSize: font }]}>
        {initialsOf(name)}
      </ThemedText>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityLabel={`${name}'s photo`}
          style={[styles.image, { borderRadius: Radii.pill }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontFamily: Fonts.sansSemibold,
    letterSpacing: 0.5,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
