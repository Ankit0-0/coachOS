import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exploreApi, type DirectoryCoach } from '@/lib/api';
import { experienceLabel, relationshipPill } from '@/lib/explore';

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

  return (
    <ScreenScaffold includeBottomTabInset>
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

          {coaches.map((coach) => {
            const pill = relationshipPill(coach.relationship);
            const experience = experienceLabel(coach.yearsExperience);
            return (
              <Pressable
                key={coach.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${coach.name}'s profile`}
                onPress={() => router.push({ pathname: '/coaches/[id]', params: { id: coach.id } })}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Card style={styles.row}>
                  <Avatar name={coach.name} size="md" imageUrl={coach.avatarUrl} />
                  <View style={styles.rowCopy}>
                    <View style={styles.nameRow}>
                      <ThemedText type="smallBold" style={styles.name}>
                        {coach.name}
                      </ThemedText>
                      {pill ? <Pill label={pill.label} tone={pill.tone} /> : null}
                    </View>
                    {experience ? <ThemedText type="meta">{experience}</ThemedText> : null}
                    {coach.specialties.length > 0 ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {coach.specialties.join(' · ')}
                      </ThemedText>
                    ) : null}
                    {coach.bio ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {coach.bio}
                      </ThemedText>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
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
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  rowCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  stateCard: {
    gap: Spacing.two,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
