import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Radii, Spacing } from '@/constants/theme';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTheme } from '@/hooks/use-theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { pickAndUploadImage } from '@/lib/image-upload';
import {
  dietDetails,
  type DietMealStatus,
  getDietComment,
  getDietMealStatusItems,
  setDietComment,
  updateDietMealStatus,
} from '@/utils/dashboard-data';

/**
 * The { [mealId]: key } map the check-in stores. Built from local state each
 * time because the column is replaced wholesale on every save.
 */
function photoKeysOf(meals: DietMealStatus[]): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const meal of meals) {
    if (meal.photoKey) keys[meal.id] = meal.photoKey;
  }
  return keys;
}

export function DietDetailsScreen() {
  const theme = useTheme();
  const { hasCoach, isLoading: isCheckingOnboarding } = useOnboardingStatus();
  const { diet: dietAssignment } = useTrackingAssignments();
  const [meals, setMeals] = useState(() => getDietMealStatusItems());
  const [comment, setCommentState] = useState(() => getDietComment());
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  /** Which meal is mid-upload, so only that row shows a spinner. */
  const [uploadingMealId, setUploadingMealId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Restore today's already-checked meals so progress survives app restarts.
  const hasLoadedToday = useRef(false);
  useEffect(() => {
    if (!dietAssignment || hasLoadedToday.current) return;
    hasLoadedToday.current = true;

    (async () => {
      try {
        const rows = await trackingApi.listCheckIns({
          assignmentId: dietAssignment.id,
          from: todayKey(),
          to: todayKey(),
        });
        const checkIn = rows[0];
        if (!checkIn) return;

        const completed = new Set(checkIn.completedItemIds);
        const photoUrls = checkIn.photoUrls ?? {};
        setMeals((current) =>
          current.map((meal) => ({
            ...meal,
            checked: completed.has(meal.id),
            // A signed URL comes back on every read; the key itself never does,
            // so it stays in state only for photos added this session.
            imageUri: photoUrls[meal.id] ?? meal.imageUri,
          })),
        );
        // Keep the module-level cache in sync for other screens in this session.
        for (const meal of getDietMealStatusItems()) {
          updateDietMealStatus(meal.id, { checked: completed.has(meal.id) });
        }
      } catch {
        // Could not restore — leave today's screen empty.
      }
    })();
  }, [dietAssignment]);

  const handleToggleMeal = (id: string) => {
    const next = meals.map((meal) =>
      meal.id === id ? { ...meal, checked: !meal.checked } : meal,
    );

    setMeals(next);
    setSaveMessage(null);

    const updatedMeal = next.find((meal) => meal.id === id);
    if (updatedMeal) {
      updateDietMealStatus(id, { checked: updatedMeal.checked });
    }

    if (dietAssignment) {
      trackingApi
        .saveCheckIn({
          assignmentId: dietAssignment.id,
          date: todayKey(),
          completedItemIds: next.filter((meal) => meal.checked).map((meal) => meal.id),
          // photoKeys is stored whole, so it has to be re-sent or ticking a
          // meal would wipe the photos.
          photoKeys: photoKeysOf(next),
        })
        .catch(() => {
          // Optimistic UI — keep the local toggle even if the sync fails.
        });
    }
  };

  /** Writes a photo onto one meal in both local state and the shared cache. */
  const applyPhoto = (id: string, changes: { imageUri: string; photoKey: string }): DietMealStatus[] => {
    const next = getDietMealStatusItems().map((meal) =>
      meal.id === id ? { ...meal, ...changes } : meal,
    );
    updateDietMealStatus(id, changes);
    setMeals(next);
    return next;
  };

  const handlePhotoPick = async (id: string) => {
    if (uploadingMealId) return;

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
    const withLocal = applyPhoto(id, { imageUri: result.uri, photoKey: result.key });

    if (!dietAssignment) {
      setPhotoError('Photo uploaded, but there is no active diet plan to attach it to.');
      return;
    }

    try {
      const checkIn = await trackingApi.saveCheckIn({
        assignmentId: dietAssignment.id,
        date: todayKey(),
        completedItemIds: withLocal.filter((meal) => meal.checked).map((meal) => meal.id),
        photoKeys: photoKeysOf(withLocal),
      });
      const signedUrl = checkIn.photoUrls?.[id];
      if (signedUrl) applyPhoto(id, { imageUri: signedUrl, photoKey: result.key });
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? `Photo uploaded, but saving it to today's log failed: ${error.message}`
          : "Photo uploaded, but saving it to today's log failed.",
      );
    }
  };

  const handleCommentChange = (value: string) => {
    setCommentState(value);
    setDietComment(value);
  };

  const handleSaveDietLog = async () => {
    if (!dietAssignment) {
      setSaveMessage('No active diet assignment found.');
      return;
    }
    try {
      setIsSavingLog(true);
      const completedItemIds = meals.filter((meal) => meal.checked).map((meal) => meal.id);
      await trackingApi.saveCheckIn({
        assignmentId: dietAssignment.id,
        date: todayKey(),
        completedItemIds,
        photoKeys: photoKeysOf(meals),
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

  if (isCheckingOnboarding) {
    return (
      <ScreenScaffold>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!hasCoach) {
    return <LockedState title="Diet" />;
  }

  return (
    <ScreenScaffold>
      <DetailHeader title="Diet" subtitle={dietDetails.title} />

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color: theme.warning }}>
          {dietDetails.calories}
        </ThemedText>
        <ThemedText>{dietDetails.focus}</ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {meals.map((meal) => (
          <ThemedView key={meal.id} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: meal.checked }}
              onPress={() => handleToggleMeal(meal.id)}
              style={[styles.checkbox, meal.checked && styles.checkboxChecked]}>
              {meal.checked ? (
                <ThemedText themeColor="onAccent" style={styles.checkText}>
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>

            <View style={styles.mealContent}>
              <View style={styles.mealHeaderRow}>
                <ThemedText style={styles.rowText}>{meal.meal}</ThemedText>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.imageUri ? 'Change' : 'Add'} photo for ${meal.meal}`}
                  onPress={() => void handlePhotoPick(meal.id)}
                  disabled={uploadingMealId !== null}
                  style={[styles.photoButton, { borderColor: theme.border }]}>
                  {uploadingMealId === meal.id ? (
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                  ) : (
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.photoButtonText}>
                      {meal.imageUri ? 'Change photo' : 'Add photo'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              {meal.imageUri ? (
                <Image
                  source={{ uri: meal.imageUri }}
                  accessibilityLabel={`Photo of ${meal.meal}`}
                  style={[styles.thumbnail, { backgroundColor: theme.surfaceSunken }]}
                />
              ) : null}
            </View>
          </ThemedView>
        ))}
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
          onChangeText={handleCommentChange}
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
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#8FA3B7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#3A7BFF',
    borderColor: '#3A7BFF',
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
