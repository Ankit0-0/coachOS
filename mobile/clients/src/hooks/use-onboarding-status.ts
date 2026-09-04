import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { clientInviteApi } from '@/lib/api';

/**
 * Whether this client has at least one ACCEPTED coach. Screens that require
 * a coach (Home, Workout, Diet, History) should gate on `hasCoach` and show
 * a locked state instead of rendering — Explore Coaches and Profile are
 * always available regardless of this status.
 */
export function useOnboardingStatus() {
  const [hasCoach, setHasCoach] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      clientInviteApi
        .list('ACCEPTED')
        .then((invites) => {
          if (active) setHasCoach(invites.length > 0);
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

  return { hasCoach, isLoading };
}
