import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CoachCard } from '@/components/explore/CoachCard';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radii, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { exploreApi, type DirectoryCoach } from '@/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ExploreCoachesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [coaches, setCoaches] = useState<DirectoryCoach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCoaches(await exploreApi.listCoaches());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // On focus, so a request sent or cancelled on a profile shows up on return.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { isRefreshing, refresh } = useRefresh(load);

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <ThemedText type="display">Explore</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Coaches who have chosen to be listed. Open a profile to ask one to coach you.
        </ThemedText>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : loadError && coaches.length === 0 ? (
        <Card style={styles.stateCard}>
          <ThemedText type="smallBold">Couldn&apos;t load coaches</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {loadError}
          </ThemedText>
          <Button label="Try again" variant="secondary" onPress={() => void load()} />
        </Card>
      ) : coaches.length === 0 ? (
        <Card style={styles.stateCard}>
          <ThemedText type="smallBold">No coaches are listed yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Coaches appear here once they choose to be listed. You can still join one directly
            if they invite you by email.
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.list}>
          {loadError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="small" themeColor="danger">
                Couldn&apos;t refresh: {loadError}
              </ThemedText>
            </View>
          ) : null}

          {coaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={coach}
              onPress={() => router.push({ pathname: '/coaches/[id]', params: { id: coach.id } })}
            />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
  stateCard: {
    gap: Spacing.two,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
