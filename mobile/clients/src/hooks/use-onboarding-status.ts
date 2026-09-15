import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { clientInviteApi, type InvitePerson } from '@/lib/api';

/**
 * Whether this client has at least one ACCEPTED coach. Screens that require
 * a coach (Home, Workout, Diet, History) should gate on `hasCoach` and show
 * a locked state instead of rendering — Explore Coaches and Profile are
 * always available regardless of this status.
 *
 * `coach` is that coach (with phone and photo, which only an accepted invite
 * carries), from the same request — so Home's coach strip costs nothing extra.
 *
 * `reload()` is exposed for pull-to-refresh and never rejects.
 */
export function useOnboardingStatus() {
  const [coach, setCoach] = useState<InvitePerson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const invites = await clientInviteApi.list('ACCEPTED');
      if (isMounted.current) setCoach(invites[0]?.coach ?? null);
    } catch {
      // Network/auth failure: fail closed (locked) rather than crash.
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      void reload();
      return () => {
        isMounted.current = false;
      };
    }, [reload]),
  );

  return { hasCoach: coach !== null, coach, isLoading, reload };
}
