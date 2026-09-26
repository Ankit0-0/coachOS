import { type ComponentProps } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '../provider';
import type { Theme, ThemeColor } from '../themes';
import { Fonts, Radii, Spacing } from '../tokens';
import { ThemedText } from './text';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export type ChipTone = 'green' | 'terracotta' | 'neutral' | 'success' | 'warning' | 'partial' | 'danger';

const CHIP_COLORS: Record<ChipTone, { fill: ThemeColor; text: ThemeColor }> = {
  green: { fill: 'chipBg', text: 'chipText' },
  terracotta: { fill: 'chipWarmBg', text: 'chipWarmText' },
  neutral: { fill: 'chipNeutralBg', text: 'chipNeutralText' },
  success: { fill: 'successBg', text: 'success' },
  warning: { fill: 'warningBg', text: 'warning' },
  partial: { fill: 'partialBg', text: 'partial' },
  danger: { fill: 'dangerSoft', text: 'danger' },
};

/** Pill label (landing: `rounded-full px-3 py-1 text-xs font-semibold`). */
export function Chip({
  label,
  tone = 'neutral',
  icon,
  singleLine = false,
}: {
  label: string;
  tone?: ChipTone;
  icon?: SymbolName;
  /** One line within the parent's width, ellipsised rather than wrapping. */
  singleLine?: boolean;
}) {
  const theme = useTheme();
  const { fill, text } = CHIP_COLORS[tone];
  return (
    <View style={[styles.chip, singleLine && styles.chipSingleLine, { backgroundColor: theme[fill] }]}>
      {icon ? <SymbolView name={icon} size={12} tintColor={theme[text]} /> : null}
      <ThemedText
        type="chip"
        themeColor={text}
        numberOfLines={singleLine ? 1 : undefined}
        style={singleLine ? styles.chipTextShrink : undefined}>
        {label}
      </ThemedText>
    </View>
  );
}

type PillTone = 'accent' | 'success' | 'warning' | 'neutral';

const PILL_TO_CHIP: Record<PillTone, ChipTone> = {
  accent: 'green',
  success: 'success',
  warning: 'warning',
  neutral: 'neutral',
};

/** Older name for Chip, with the status tones the apps already use. */
export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  return <Chip label={label} tone={PILL_TO_CHIP[tone]} />;
}

/** Count dot for unread and pending items. */
export function CountBadge({ count, accessibilityLabel }: { count: number; accessibilityLabel?: string }) {
  const theme = useTheme();
  if (count <= 0) return null;
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? String(count)}
      style={[styles.count, { backgroundColor: theme.countBadge }]}>
      <ThemedText type="chip" themeColor="onCountBadge" style={styles.tabular}>
        {count > 99 ? '99+' : count}
      </ThemedText>
    </View>
  );
}

/** Numbered step circle (landing: `h-9 w-9 rounded-full bg-forest`). */
export function NumberBadge({ value, size = 40 }: { value: number | string; size?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: theme.primary }]}>
      <ThemedText themeColor="onPrimary" style={[styles.number, styles.tabular]}>
        {value}
      </ThemedText>
    </View>
  );
}

export type AvatarTone = 'green' | 'warm' | 'neutral';

const AVATAR_COLORS: Record<AvatarTone, { fill: keyof Theme; text: ThemeColor }> = {
  green: { fill: 'chipBg', text: 'chipText' },
  warm: { fill: 'chipWarmBg', text: 'chipWarmText' },
  neutral: { fill: 'chipNeutralBg', text: 'chipNeutralText' },
};

const AVATAR_SIZES = {
  sm: { box: 36, font: 13 },
  row: { box: 44, font: 15 },
  md: { box: 52, font: 18 },
  lg: { box: 84, font: 28 },
} as const;

/** First letters of the first and last word, e.g. "Test Coach One" -> "TO". */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

type AvatarProps = {
  name: string;
  size?: keyof typeof AVATAR_SIZES;
  /** A signed URL from the API. Initials show when it is null or fails. */
  imageUrl?: string | null;
  /** Landing convention: green for coaches, warm for clients. */
  tone?: AvatarTone;
};

export function Avatar({ name, size = 'md', imageUrl, tone = 'green' }: AvatarProps) {
  const theme = useTheme();
  const { box, font } = AVATAR_SIZES[size];
  const { fill, text } = AVATAR_COLORS[tone];
  // Signed URLs expire; initials stay underneath as the backdrop.
  return (
    <View style={[styles.circle, { width: box, height: box, backgroundColor: theme[fill] }]}>
      <ThemedText themeColor={text} style={[styles.initials, { fontSize: font, lineHeight: font * 1.25 }]}>
        {initialsOf(name)}
      </ThemedText>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} accessibilityLabel={`${name}'s photo`} style={styles.image} />
      ) : null}
    </View>
  );
}

/** Square icon tile (landing: `h-11 w-11 rounded-2xl bg-sage text-forest`). */
export function IconTile({ icon, tone = 'green', size = 44 }: { icon: SymbolName; tone?: 'green' | 'terracotta' | 'primary'; size?: number }) {
  const theme = useTheme();
  const fill = tone === 'primary' ? theme.primary : tone === 'terracotta' ? theme.chipWarmBg : theme.chipBg;
  const tint = tone === 'primary' ? theme.onPrimary : tone === 'terracotta' ? theme.chipWarmText : theme.chipText;
  return (
    <View style={[styles.tile, { width: size, height: size, backgroundColor: fill }]}>
      <SymbolView name={icon} size={Math.round(size / 2)} tintColor={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    minHeight: 28,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radii.pill,
  },
  chipSingleLine: {
    maxWidth: '100%',
  },
  chipTextShrink: {
    flexShrink: 1,
  },
  count: {
    minWidth: 20,
    minHeight: 20,
    paddingHorizontal: Spacing.one + Spacing.half,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  circle: {
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  number: {
    fontFamily: Fonts.display,
    fontSize: 15,
    lineHeight: 20,
  },
  initials: {
    fontFamily: Fonts.display,
  },
  image: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radii.pill,
  },
  tile: {
    borderRadius: Radii.lg - Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
