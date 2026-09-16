import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { scheduleApi, type ScheduleEntry } from '@/lib/api';
import { todayKey } from '@/lib/dates';

/**
 * Today's day of each plan the client is on, resolved by the backend.
 *
 * The rotation is never worked out here: a screen asks what today is and
 * renders it. Reloads on focus, so a plan assigned while the app is open shows
 * up on the next visit, and so the day rolls over if the app is left open
 * past midnight and returned to.
 */
export function useTodaySchedule() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  const reload = useCallback(async () => {
    const today = todayKey();
    try {
      const data = await scheduleApi.list({ from: today, to: today });
      if (!isMounted.current) return;
      setEntries(data);
      setError(null);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err : new Error('Could not load today.'));
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

  return {
    entries,
    workout: entries.find((entry) => entry.type === 'WORKOUT'),
    diet: entries.find((entry) => entry.type === 'DIET'),
    isLoading,
    error,
    reload,
  };
}

/**
 * The schedule across a range of dates — what the month's calendar needs, since
 * each date has its own item total once a plan rotates.
 */
export function useScheduleRange(from: string, to: string) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  // Ranges change as the client steps through months; only the latest may land.
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const data = await scheduleApi.list({ from, to });
      if (!isMounted.current || request !== latestRequest.current) return;
      setEntries(data);
    } catch {
      // The calendar still renders what a check-in says; totals just go unknown.
    } finally {
      if (isMounted.current && request === latestRequest.current) setIsLoading(false);
    }
  }, [from, to]);

  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      void reload();
      return () => {
        isMounted.current = false;
      };
    }, [reload]),
  );

  return { entries, isLoading, reload };
}
