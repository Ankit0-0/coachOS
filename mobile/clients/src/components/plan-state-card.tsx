import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlanStateCardProps = {
  title: string;
  message: string;
  tone?: 'neutral' | 'danger';
};

/**
 * The panel a plan screen shows instead of content: no plan assigned yet, or
 * the plan couldn't be loaded. Deliberately never falls back to sample data —
 * a client should only ever see what their coach actually assigned.
 */
export function PlanStateCard({ title, message, tone = 'neutral' }: PlanStateCardProps) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.panel,
        { borderColor: theme.border },
        tone === 'danger' && { backgroundColor: theme.dangerSoft },
      ]}>
      <ThemedText type="smallBold" themeColor={tone === 'danger' ? 'danger' : 'text'}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor={tone === 'danger' ? 'danger' : 'textSecondary'}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.one,
  },
});
