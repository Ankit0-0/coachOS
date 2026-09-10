import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PillTone = 'accent' | 'success' | 'warning' | 'neutral';

const TONE_COLORS: Record<PillTone, { fill: ThemeColor; text: ThemeColor }> = {
  accent: { fill: 'accentSoft', text: 'accent' },
  success: { fill: 'accentSoft', text: 'success' },
  warning: { fill: 'accentSoft', text: 'warning' },
  neutral: { fill: 'surfaceSunken', text: 'textSecondary' },
};

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: PillTone }) {
  const theme = useTheme();
  const { fill, text } = TONE_COLORS[tone];

  return (
    <View style={[styles.pill, { backgroundColor: theme[fill] }]}>
      <ThemedText type="meta" themeColor={text} style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: 700,
  },
});
