import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { PlanStateCard } from '@/components/plan-state-card';
import { RestDayCard } from '@/components/rest-day-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card, InsetPanel } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Radii, Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTodaySchedule } from '@/hooks/use-schedule';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { confirmDestructive } from '@/lib/confirm';
import { pickAndUploadImage } from '@/lib/image-upload';
import { cycleDayLabel, dietDayOf } from '@/lib/plan-content';
import { formatCalories } from '@/lib/plan-units';
import { Checkbox, ProgressBar, TextField } from '@coachos/theme';

export function DietDetailsScreen() {
  const theme = useTheme();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  // Today's day of the cycle, resolved by the backend.
  const schedule = useTodaySchedule();
  const today = schedule.diet;
  const dietAssignment = tracking.diet;
  const assignmentId = dietAssignment?.id;
  const day = useMemo(() => dietDayOf(today), [today]);
  const meals = day?.meals ?? [];

  // Per-meal state, keyed by the plan's meal ids (which are also the check-in item ids).
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  /** Signed URLs from the API, or a local file while an upload is saving. */
  const [photoUris, setPhotoUris] = useState<Record<string, string>>({});
  // Component state only: nothing about one client's day is kept at module
  // level, where it would survive a sign-out and show to the next user.
  const [comment, setComment] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** Which meal is mid-upload, so only that row shows a spinner. */
  const [uploadingMealId, setUploadingMealId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  /** Today's saved check-in: ticks and photos, so progress survives restarts. */
  const loadToday = useCallback(async () => {
    if (!assignmentId) return;
    try {
      const rows = await trackingApi.listCheckIns({ assignmentId, from: todayKey(), to: todayKey() });
      const checkIn = rows[0];
      setCheckedIds(new Set(checkIn?.completedItemIds ?? []));
      // Reads carry signed URLs only, never keys — which is fine, because
      // adding a photo sends just that meal's key and the server merges.
      setPhotoUris(checkIn?.photoUrls ?? {});
    } catch {
      // Could not restore — keep whatever is on screen.
    }
  }, [assignmentId]);

  // Restored on focus (and again if the assignment changes); pull-to-refresh
  // calls it directly.
  useFocusEffect(
    useCallback(() => {
      void loadToday();
    }, [loadToday]),
  );

  const { isRefreshing, refresh } = useRefresh(onboarding.reload, tracking.reload, schedule.reload, loadToday);

  /** Only ids that belong to the current plan — a stale tick from an old plan never gets saved. */
  function completedItemIds(ids: Set<string>): string[] {
    return meals.filter((meal) => ids.has(meal.id)).map((meal) => meal.id);
  }

  const handleToggleMeal = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    setCheckedIds(next);
    setSaveMessage(null);

    if (assignmentId) {
      trackingApi
        .saveCheckIn({ assignmentId, date: todayKey(), completedItemIds: completedItemIds(next) })
        .catch(() => {
          // Optimistic UI — keep the local toggle even if the sync fails.
        });
    }
  };

  const handlePhotoPick = async (id: string) => {
    if (uploadingMealId || !assignmentId) return;

    setPhotoError(null);
    setSaveMessage(null);
    setUploadingMealId(id);

    let result;
    try {
      result = await pickAndUploadImage('diet');
    } finally {
      setUploadingMealId(null);
    }

    // Backing out of the picker is not a failure — leave the row untouched.
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setPhotoError(result.message);
      return;
    }

    // Show the local file straight away, then swap in the signed URL the API
    // returns once the key is saved against today's check-in.
    setPhotoUris((current) => ({ ...current, [id]: result.uri }));

    try {
      const checkIn = await trackingApi.saveCheckIn({
        assignmentId,
        date: todayKey(),
        completedItemIds: completedItemIds(checkedIds),
        // Only this meal's key: the server merges it into the stored map, so
        // photos on the other meals are left exactly as they were.
        photoKeys: { [id]: result.key },
      });
      const signedUrl = checkIn.photoUrls?.[id];
      if (signedUrl) setPhotoUris((current) => ({ ...current, [id]: signedUrl }));
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? `Photo uploaded, but saving it to today's log failed: ${error.message}`
          : "Photo uploaded, but saving it to today's log failed.",
      );
    }
  };

  const handleRemovePhoto = async (id: string, label: string) => {
    if (!assignmentId || !photoUris[id]) return;
    const confirmed = await confirmDestructive({
      title: 'Remove meal photo?',
      message: `This deletes the photo for ${label} for good. The meal stays ticked.`,
      confirmLabel: 'Remove',
    });
    if (!confirmed) return;

    const previous = photoUris[id];
    setPhotoError(null);
    setPhotoUris((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    try {
      const checkIn = await trackingApi.saveCheckIn({
        assignmentId,
        date: todayKey(),
        completedItemIds: completedItemIds(checkedIds),
        // A null value removes just this meal's photo.
        photoKeys: { [id]: null },
      });
      setPhotoUris(checkIn.photoUrls ?? {});
    } catch (error) {
      setPhotoUris((current) => ({ ...current, [id]: previous }));
      setPhotoError(error instanceof Error ? error.message : 'Could not remove the photo. Please try again.');
    }
  };

  const handleSaveDietLog = async () => {
    if (!assignmentId) return;
    try {
      setIsSavingLog(true);
      await trackingApi.saveCheckIn({
        assignmentId,
        date: todayKey(),
        completedItemIds: completedItemIds(checkedIds),
      });
      setSaveMessage('Diet log saved to your history.');
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : 'Could not save the diet log. Please try again.',
      );
    } finally {
      setIsSavingLog(false);
    }
  };

  if (onboarding.isLoading) {
    return (
      <ScreenScaffold>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!onboarding.hasCoach) {
    return <LockedState title="Diet" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  if (tracking.isLoading || schedule.isLoading) {
    return (
      <ScreenScaffold>
        <DetailHeader title="Diet" subtitle="Loading your plan…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  // Diet cycles have no rest days, but a day can still be empty if the coach
  // left it so; treat that the same way.
  if (today?.isRestDay) {
    return (
      <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
        <DetailHeader title="Diet" subtitle={today.title} />
        <RestDayCard cycleLabel={cycleDayLabel(today)} />
      </ScreenScaffold>
    );
  }

  // Only fall through to the plan when there is a real, readable one.
  if (!dietAssignment || !today || meals.length === 0) {
    const failed = !dietAssignment && tracking.error;
    return (
      <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
        <DetailHeader title="Diet" subtitle={failed ? 'Something went wrong' : 'No plan yet'} />
        {failed ? (
          <PlanStateCard
            tone="danger"
            title="Couldn't load your diet plan"
            message={`${tracking.error?.message ?? 'Check your connection.'} Pull down to try again.`}
          />
        ) : (
          <PlanStateCard
            title="Your coach hasn't assigned a diet plan yet"
            message="When they do, your meals will appear here. Pull down to check again."
          />
        )}
      </ScreenScaffold>
    );
  }

  const mealsDone = meals.filter((meal) => checkedIds.has(meal.id)).length;

  return (
    <ScreenScaffold refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Diet" subtitle={dietAssignment.title} />

      {tracking.error ? (
        <PlanStateCard
          tone="danger"
          title="Couldn't refresh your plan"
          message={`${tracking.error.message} Showing the last version loaded.`}
        />
      ) : null}

      <Card style={styles.summary}>
        <View style={styles.summaryChips}>
          <Chip label={`Diet · ${cycleDayLabel(today)}`} tone="terracotta" />
          {day?.calories ? <Chip label={formatCalories(day.calories)} tone="neutral" /> : null}
        </View>
        {day?.label ? <ThemedText type="heading">{day.label}</ThemedText> : null}
        <ProgressBar
          value={meals.length > 0 ? mealsDone / meals.length : 0}
          color="chartDiet"
          label={`${mealsDone} of ${meals.length} meals done`}
        />
      </Card>

      <Card style={styles.mealsCard}>
        <ThemedText type="heading">Meals</ThemedText>
        <InsetPanel>
          {meals.map((meal) => {
            const checked = checkedIds.has(meal.id);
            const imageUri = photoUris[meal.id];
            return (
              <View key={meal.id} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.rowTop}>
                  <Checkbox checked={checked} accessibilityLabel={meal.label} onPress={() => handleToggleMeal(meal.id)} />
                  <ThemedText
                    type="smallBold"
                    themeColor={checked ? 'textMuted' : 'textPrimary'}
                    style={[styles.rowText, checked && styles.done]}>
                    {meal.label}
                  </ThemedText>
                  <Button
                    label={imageUri ? 'Change' : 'Photo'}
                    variant="secondary"
                    size="sm"
                    icon={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                    loading={uploadingMealId === meal.id}
                    disabled={uploadingMealId !== null}
                    accessibilityLabel={`${imageUri ? 'Change' : 'Add'} photo for ${meal.label}`}
                    onPress={() => void handlePhotoPick(meal.id)}
                  />
                </View>

                {imageUri ? (
                  <View style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: imageUri }}
                      accessibilityLabel={`Photo of ${meal.label}`}
                      style={[styles.thumbnail, { backgroundColor: theme.surfaceInset }]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove photo for ${meal.label}`}
                      onPress={() => void handleRemovePhoto(meal.id, meal.label)}
                      hitSlop={10}
                      style={[styles.removeBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      <SymbolView
                        name={{ ios: 'xmark', android: 'close', web: 'close' }}
                        size={12}
                        tintColor={theme.textPrimary}
                      />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </InsetPanel>
        {photoError ? (
          <ThemedText type="small" themeColor="warning">
            {photoError}
          </ThemedText>
        ) : null}
      </Card>

      <Card style={styles.commentCard}>
        <ThemedText type="heading">Comment</ThemedText>
        <TextField
          value={comment}
          onChangeText={setComment}
          placeholder="How was today's diet?"
          multiline
          numberOfLines={4}
          accessibilityLabel="Comment on today's diet"
        />
      </Card>

      <View style={styles.footer}>
        {saveMessage ? (
          <ThemedText
            type="small"
            themeColor={saveMessage.startsWith('Diet log saved') ? 'success' : 'warning'}
            style={styles.footerMessage}>
            {saveMessage}
          </ThemedText>
        ) : null}
        <Button label={isSavingLog ? 'Saving…' : 'Save diet log'} loading={isSavingLog} onPress={handleSaveDietLog} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: Spacing.twoHalf,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  mealsCard: {
    gap: Spacing.three,
  },
  row: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    gap: Spacing.twoHalf,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: 36,
  },
  rowText: {
    flex: 1,
  },
  done: {
    textDecorationLine: 'line-through',
  },
  thumbnailWrap: {
    alignSelf: 'stretch',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: Radii.sm,
  },
  removeBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentCard: {
    gap: Spacing.twoHalf,
  },
  footer: {
    gap: Spacing.two,
  },
  footerMessage: {
    textAlign: 'center',
  },
});
