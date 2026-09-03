import { useEffect, useState } from 'react';

import { trackingApi, type TrackingAssignment } from '@/lib/api';

export function useTrackingAssignments() {
  const [assignments, setAssignments] = useState<TrackingAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await trackingApi.listAssignments();
        if (active) setAssignments(data);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err : new Error('Failed to load assignments'));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const workout = assignments.find((item) => item.type === 'WORKOUT');
  const diet = assignments.find((item) => item.type === 'DIET');

  return { assignments, workout, diet, isLoading, error };
}
