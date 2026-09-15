import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { PlanStateCard } from '@/components/plan-state-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { pickAndUploadImage } from '@/lib/image-upload';
import { dietContentOf } from '@/lib/plan-content';

export function DietDetailsScreen() {
  const theme = useTheme();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  const dietAssignment = tracking.diet;
  const assignmentId = dietAssignment?.id;
  const content = useMemo(() => dietContentOf(dietAssignment), [dietAssignment]);
  const meals = content?.meals ?? [];

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

  const { isRefreshing, refresh } = useRefresh(onboarding.reload, tracking.reload, loadToday);

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

  if (tracking.isLoading) {
    return (
      <ScreenScaffold>
        <DetailHeader title="Diet" subtitle="Loading your plan…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  // Only fall through to the plan when there is a real, readable one.
  if (!dietAssignment || !content || meals.length === 0) {
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

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        {content.calories ? (
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            {content.calories}
          </ThemedText>
        ) : null}
        {content.focus ? <ThemedText>{content.focus}</ThemedText> : null}
      </ThemedView>

      <View style={styles.list}>
        {meals.map((meal) => {
          const checked = checkedIds.has(meal.id);
          const imageUri = photoUris[meal.id];
          return (
            <ThemedView key={meal.id} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={meal.label}
                onPress={() => handleToggleMeal(meal.id)}
                style={[
                  styles.checkbox,
                  { borderColor: checked ? theme.accent : theme.textMuted },
                  checked && { backgroundColor: theme.accent },
                ]}>
                {checked ? (
                  <ThemedText themeColor="onAccent" style={styles.checkText}>
                    ✓
                  </ThemedText>
                ) : null}
              </Pressable>

              <View style={styles.mealContent}>
                <View style={styles.mealHeaderRow}>
                  <ThemedText style={styles.rowText}>{meal.label}</ThemedText>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${imageUri ? 'Change' : 'Add'} photo for ${meal.label}`}
                    onPress={() => void handlePhotoPick(meal.id)}
                    disabled={uploadingMealId !== null}
                    style={[styles.photoButton, { borderColor: theme.border }]}>
                    {uploadingMealId === meal.id ? (
                      <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : (
                      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.photoButtonText}>
                        {imageUri ? 'Change photo' : 'Add photo'}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>

                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    accessibilityLabel={`Photo of ${meal.label}`}
                    style={[styles.thumbnail, { backgroundColor: theme.surfaceSunken }]}
                  />
                ) : null}
              </View>
            </ThemedView>
          );
        })}
      </View>

      {photoError ? (
        <ThemedText type="small" themeColor="warning">
          {photoError}
        </ThemedText>
      ) : null}

      <ThemedView type="backgroundElement" style={[styles.commentCard, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Comment</ThemedText>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="How was today's diet?"
          multiline
          numberOfLines={4}
          style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
          placeholderTextColor={theme.textSecondary}
        />
      </ThemedView>

      <View style={styles.footer}>
        {saveMessage ? (
          <ThemedText
            type="small"
            themeColor={saveMessage.startsWith('Diet log saved') ? 'success' : 'warning'}
            style={styles.footerMessage}>
            {saveMessage}
          </ThemedText>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={handleSaveDietLog}
          disabled={isSavingLog}
          style={({ pressed }) => [
            styles.saveLogButton,
            { backgroundColor: theme.accent, opacity: isSavingLog ? 0.6 : pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="onAccent">
            {isSavingLog ? 'Saving…' : 'Save diet log'}
          </ThemedText>
        </Pressable>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkText: {
    fontFamily: Fonts.sansBold,
    fontSize: 12,
  },
  mealContent: {
    flex: 1,
    gap: Spacing.one,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    lineHeight: 20,
  },
  photoButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    alignSelf: 'flex-end',
    minHeight: 28,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonText: {
    fontSize: 11,
  },
  thumbnail: {
    width: '100%',
    height: 90,
    borderRadius: Spacing.two,
  },
  commentCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  textInput: {
    minHeight: 96,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    textAlignVertical: 'top',
  },
  footer: {
    marginTop: Spacing.three,
    gap: Spacing.one,
  },
  footerMessage: {
    textAlign: 'center',
  },
  saveLogButton: {
    paddingVertical: Spacing.three,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
