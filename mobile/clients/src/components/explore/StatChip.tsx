import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatChipProps = {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
};

export const EXPERIENCE_ICON: StatChipProps['icon'] = { ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' };
export const CLIENTS_ICON: StatChipProps['icon'] = { ios: 'person.2', android: 'group', web: 'group' };

/**
 * A fact about a coach at a glance: an icon and a short phrase. Outlined with
 * no fill, so it reads apart from the filled specialty tags beside it — what a
 * coach does versus their track record. Neutral on purpose: it's information,
 * and the accent stays for the one thing a card can actually be, yours.
 */
export function StatChip({ icon, label }: StatChipProps) {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { borderColor: theme.border }]}>
      <SymbolView name={icon} size={14} tintColor={theme.textSecondary} />
      <ThemedText type="meta" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
