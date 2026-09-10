import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldRowProps = {
  label: string;
  /** Falls back to a muted "Not set" when empty, so blanks never read as broken. */
  value?: string | null | undefined;
  /** Long values (bio, goals) stack under the label instead of sitting beside it. */
  stacked?: boolean;
  divider?: boolean;
};

export function FieldRow({ label, value, stacked = false, divider = true }: FieldRowProps) {
  const theme = useTheme();
  const isEmpty = value === null || value === undefined || value.trim() === '';

  return (
    <View style={[styles.container, divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={stacked ? styles.stacked : styles.inline}>
        <ThemedText type="label" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText
          type={stacked ? 'small' : 'smallBold'}
          themeColor={isEmpty ? 'textMuted' : 'text'}
          style={stacked ? undefined : styles.inlineValue}>
          {isEmpty ? 'Not set' : value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.three,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  stacked: {
    gap: Spacing.one,
  },
  inlineValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
