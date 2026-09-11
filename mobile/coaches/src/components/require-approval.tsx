import { type ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { PendingApprovalState } from '@/components/pending-approval-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { useApprovalStatus } from '@/hooks/use-approval-status';
import { useTheme } from '@/hooks/use-theme';

/**
 * Renders `children` only for an approved coach; everyone else gets the
 * pending state.
 *
 * Applied per route rather than in the tab layout so the Profile tab stays
 * reachable — a coach waiting on approval still needs somewhere to read their
 * status and sign out from.
 */
export function RequireApproval({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { status, isApproved, isLoading } = useApprovalStatus();

  if (isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!isApproved) {
    return <PendingApprovalState status={status} />;
  }

  return <>{children}</>;
}
