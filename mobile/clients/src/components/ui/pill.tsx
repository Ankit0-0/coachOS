import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PillTone = 'accent' | 'success' | 'warning' | 'neutral';

/**
 * Only `accent` gets the accent fill, and it is reserved for a genuinely
 * active or selected state. The rest sit on a neutral fill and let the text
 * colour carry the meaning — a status badge is information, not decoration,
 * and tinting every one of them spends the accent until it stops reading as
 * emphasis anywhere.
 */
const TONE_COLORS: Record<PillTone, { fill: ThemeColor; text: ThemeColor }> = {
  accent: { fill: 'accentSoft', text: 'accent' },
  success: { fill: 'surfaceSunken', text: 'success' },
  warning: { fill: 'surfaceSunken', text: 'warning' },
  neutral: { fill: 'surfaceSunken', text: 'textSecondary' },
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const theme = useTheme();
  const { fill, text } = TONE_COLORS[tone];

  return (
    <View style={[styles.pill, { backgroundColor: theme[fill] }]}>
      <ThemedText type="meta" themeColor={text}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
  },
});
