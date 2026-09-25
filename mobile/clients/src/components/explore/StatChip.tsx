import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';

import { Chip } from '@/components/ui/pill';

type StatChipProps = {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
};

export const EXPERIENCE_ICON: StatChipProps['icon'] = { ios: 'rosette', android: 'workspace_premium', web: 'workspace_premium' };
export const CLIENTS_ICON: StatChipProps['icon'] = { ios: 'person.2', android: 'group', web: 'group' };

/** A fact about a coach: neutral, so it reads apart from the green specialty chips. */
export function StatChip({ icon, label }: StatChipProps) {
  return <Chip icon={icon} label={label} tone="neutral" />;
}
