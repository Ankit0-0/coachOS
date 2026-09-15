import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { trackingApi, type TrackingAssignment } from '@/lib/api';

/**
 * The client's ACTIVE plan assignments, each carrying its plan's `content`.
 *
 * Reloads whenever the screen regains focus, so a plan the coach assigns while
 * the app is open shows up on the next visit. `reload()` is exposed for
 * pull-to-refresh; it resolves once the request settles and never rejects —
 * a failure lands in `error` instead.
 */
export function useTrackingAssignments() {
  const [assignments, setAssignments] = useState<TrackingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const data = await trackingApi.listAssignments();
      if (!isMounted.current) return;
      setAssignments(data);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err : new Error('Could not load your plans.'));
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

  const workout = assignments.find((item) => item.type === 'WORKOUT');
  const diet = assignments.find((item) => item.type === 'DIET');

  return { assignments, workout, diet, isLoading, error, reload };
}
