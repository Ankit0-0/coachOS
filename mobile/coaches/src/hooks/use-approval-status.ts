import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { coachProfileApi, type CoachApprovalStatus } from '@/lib/api';

/**
 * Whether an admin has approved this coach's account.
 *
 * Everything except the Profile tab and signing out should gate on
 * `isApproved` and render the pending state instead — the backend refuses
 * those actions anyway (423), so showing the screens would only let a coach
 * fill in a form that cannot succeed.
 *
 * Fails closed, mirroring the client app's useOnboardingStatus: if the
 * profile can't be fetched we treat the account as not approved rather than
 * waving it through on a network error.
 */
export function useApprovalStatus() {
  const [status, setStatus] = useState<CoachApprovalStatus | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      coachProfileApi
        .get()
        .then((profile) => {
          if (!active) return;
          setStatus(profile.approvalStatus);
          setIsApproved(profile.approvalStatus === 'APPROVED');
        })
        .catch(() => {
          // Network/auth failure: fail closed (locked) rather than crash.
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return { status, isApproved, isLoading };
}
