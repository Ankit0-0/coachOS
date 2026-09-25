import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
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
    <Card style={[styles.panel, tone === 'danger' && { backgroundColor: theme.dangerSoft }]}>
      <ThemedText type="smallBold" themeColor={tone === 'danger' ? 'danger' : 'textPrimary'}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor={tone === 'danger' ? 'danger' : 'textSecondary'}>
        {message}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.one,
  },
});
