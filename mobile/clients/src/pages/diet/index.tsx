import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { LockedState } from '@/components/locked-state';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useTheme } from '@/hooks/use-theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { trackingApi } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import {
  dietDetails,
  getDietComment,
  getDietMealStatusItems,
  setDietComment,
  updateDietMealStatus,
} from '@/utils/dashboard-data';

export function DietDetailsScreen() {
  const theme = useTheme();
  const { hasCoach, isLoading: isCheckingOnboarding } = useOnboardingStatus();
  const { diet: dietAssignment } = useTrackingAssignments();
  const [meals, setMeals] = useState(() => getDietMealStatusItems());
  const [comment, setCommentState] = useState(() => getDietComment());
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
        setMeals((current) =>
          current.map((meal) => ({ ...meal, checked: completed.has(meal.id) })),
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
      const completedItemIds = next.filter((meal) => meal.checked).map((meal) => meal.id);
      trackingApi
        .saveCheckIn({
          assignmentId: dietAssignment.id,
          date: todayKey(),
          completedItemIds,
        })
        .catch(() => {
          // Optimistic UI — keep the local toggle even if the sync fails.
        });
    }
  };

  const handlePhotoPick = (id: string) => {
    const mockImageUri = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80';

    setMeals((current) => {
      const next = current.map((meal) =>
        meal.id === id ? { ...meal, imageUri: mockImageUri } : meal,
      );

      updateDietMealStatus(id, { imageUri: mockImageUri });
      return next;
    });
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
              {meal.checked ? <ThemedText style={styles.checkText}>✓</ThemedText> : null}
            </Pressable>

            <View style={styles.mealContent}>
              <View style={styles.mealHeaderRow}>
                <ThemedText style={styles.rowText}>{meal.meal}</ThemedText>

                <Pressable onPress={() => handlePhotoPick(meal.id)} style={styles.photoButton}>
                  <ThemedText type="smallBold" style={styles.photoButtonText}>
                    {meal.imageUri ? 'Change photo' : 'Add photo'}
                  </ThemedText>
                </Pressable>
              </View>

              {meal.imageUri ? (
                <Image source={{ uri: meal.imageUri }} style={styles.thumbnail} />
              ) : null}
            </View>
          </ThemedView>
        ))}
      </View>

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
          <ThemedText type="smallBold" style={styles.saveLogButtonText}>
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
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(58, 123, 255, 0.12)',
    alignSelf: 'flex-end',
  },
  photoButtonText: {
    color: '#3A7BFF',
    fontSize: 11,
  },
  thumbnail: {
    width: '100%',
    height: 90,
    borderRadius: Spacing.two,
    backgroundColor: '#E5E7EB',
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
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLogButtonText: {
    color: '#FFFFFF',
  },
});
