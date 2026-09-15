import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { CoachStrip } from '@/components/home/CoachStrip';
import { LockedState } from '@/components/locked-state';
import { PlanCard, type HomePlanCard } from '@/components/plan-card';
import { PlanStateCard } from '@/components/plan-state-card';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTrackingAssignments } from '@/hooks/use-assignments';
import { useOnboardingStatus } from '@/hooks/use-onboarding-status';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { trackingApi, type WeightEntry } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import { pickAndUploadImage } from '@/lib/image-upload';
import { dietContentOf, workoutContentOf } from '@/lib/plan-content';
import { parseWeightInput } from '@/lib/weight';

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const onboarding = useOnboardingStatus();
  const tracking = useTrackingAssignments();
  const { workout: workoutAssignment, diet: dietAssignment } = tracking;
  const dietAssignmentId = dietAssignment?.id;
  /** Meal ids ticked in today's diet check-in, for the progress ring. */
  const [dietCheckedIds, setDietCheckedIds] = useState<string[]>([]);
  /**
   * What's already saved for today, read back from the API. Without it the card
   * only knew what had been typed since it mounted, so a saved weight showed as
   * an empty box and a saved photo vanished on the next launch.
   */
  const [todayEntry, setTodayEntry] = useState<WeightEntry | null>(null);
  /** A freshly picked local file, previewed until it's saved. */
  const [physiqueImage, setPhysiqueImage] = useState<string | null>(null);
  /** The S3 key behind it — this is what the weight entry actually stores. */
  const [physiqueKey, setPhysiqueKey] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  /** What the client has typed; null until they edit, so the field shows today's saved weight. */
  const [weightValue, setWeightValue] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadDietProgress = useCallback(async () => {
    if (!dietAssignmentId) {
      setDietCheckedIds([]);
      return;
    }
    try {
      const rows = await trackingApi.listCheckIns({
        assignmentId: dietAssignmentId,
        from: todayKey(),
        to: todayKey(),
      });
      setDietCheckedIds(rows[0]?.completedItemIds ?? []);
    } catch {
      // Progress is secondary; the card still opens the plan without it.
    }
  }, [dietAssignmentId]);

  const loadTodayUpdate = useCallback(async () => {
    try {
      const [entry] = await trackingApi.listWeights({ from: todayKey(), to: todayKey() });
      setTodayEntry(entry ?? null);
    } catch {
      // Secondary: the card still lets the client log today's update.
    }
  }, []);

  // Refetched on focus so the ring reflects meals ticked on the diet screen,
  // and today's update reflects a weigh-in logged from History.
  useFocusEffect(
    useCallback(() => {
      void loadDietProgress();
      void loadTodayUpdate();
    }, [loadDietProgress, loadTodayUpdate]),
  );

  const { isRefreshing, refresh } = useRefresh(onboarding.reload, tracking.reload, loadDietProgress, loadTodayUpdate);

  const shownWeight = weightValue ?? (todayEntry ? String(todayEntry.weightKg) : '');
  const shownPhoto = physiqueImage ?? todayEntry?.photoUrl ?? null;

  // Cards only for assignments that actually exist — never sample plans.
  const planCards: HomePlanCard[] = [];
  const workoutContent = workoutContentOf(workoutAssignment);
  if (workoutAssignment && workoutContent) {
    planCards.push({
      id: 'workout',
      title: workoutAssignment.title,
      eyebrow: workoutContent.focus || "Today's workout",
      summary: workoutContent.summary,
      metric: workoutContent.duration,
      detail: workoutContent.exercises.slice(0, 2).map((exercise) => exercise.name).join(' • '),
      route: '/workout',
      iconName: { ios: 'figure.strengthtraining.traditional', android: 'fitness_center', web: 'fitness_center' },
    });
  }
  const dietContent = dietContentOf(dietAssignment);
  if (dietAssignment && dietContent) {
    const mealIds = new Set(dietContent.meals.map((meal) => meal.id));
    const ticked = dietCheckedIds.filter((id) => mealIds.has(id)).length;
    planCards.push({
      id: 'diet',
      title: dietAssignment.title,
      eyebrow: dietContent.focus || "Today's diet",
      summary: dietContent.summary,
      metric: dietContent.calories,
      detail: dietContent.meals.slice(0, 2).map((meal) => meal.label).join(' • '),
      route: '/diet',
      iconName: { ios: 'fork.knife.circle', android: 'restaurant', web: 'restaurant' },
      progressPercent: mealIds.size > 0 ? (ticked / mealIds.size) * 100 : 0,
    });
  }

  const pickPhysiquePhoto = async () => {
    if (isUploadingPhoto) return;

    setSavedMessage(null);
    setIsUploadingPhoto(true);
    let result;
    try {
      result = await pickAndUploadImage('weight');
    } finally {
      setIsUploadingPhoto(false);
    }

    // Cancelling leaves any photo already attached in place.
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setSavedMessage(result.message);
      return;
    }

    setPhysiqueImage(result.uri);
    setPhysiqueKey(result.key);
  };

  const handleSaveUpdate = async () => {
    // Checked here so an out-of-range weight gets a reason, not the API's bare 400.
    const weight = parseWeightInput(shownWeight);
    if (weight.status === 'invalid') {
      setSavedMessage(weight.message);
      return;
    }
    try {
      setIsSaving(true);
      const entry = await trackingApi.saveWeight({
        date: todayKey(),
        weightKg: weight.kg,
        // Only sent when a photo was picked, so saving a weight on its own
        // never clears a photo added earlier in the day.
        ...(physiqueKey ? { photoKey: physiqueKey } : {}),
      });
      // The saved entry is now what the card shows: its weight in the field and
      // its photo as a signed URL, so the local preview and the draft can go.
      setTodayEntry(entry);
      setWeightValue(null);
      setPhysiqueImage(null);
      setPhysiqueKey(null);
      setSavedMessage('Saved to today\u2019s update.');
    } catch (error) {
      setSavedMessage(
        error instanceof Error ? error.message : 'Could not save your update. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (onboarding.isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!onboarding.hasCoach) {
    return <LockedState title="Home" refreshing={isRefreshing} onRefresh={refresh} />;
  }

  return (
    <ScreenScaffold
      includeBottomTabInset
      refreshing={isRefreshing}
      onRefresh={refresh}
      pinnedHeader={onboarding.coach ? <CoachStrip coach={onboarding.coach} /> : null}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Coach OS
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headline}>
          Ready for today?
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          {planCards.length > 0
            ? 'Here is what your coach has lined up for today.'
            : 'Your plans will show up here as soon as your coach assigns them.'}
        </ThemedText>
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Today
        </ThemedText>
      </View>

      {tracking.isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : planCards.length > 0 ? (
        <View style={styles.cards}>
          {tracking.error ? (
            <PlanStateCard
              tone="danger"
              title="Couldn't refresh your plans"
              message={`${tracking.error.message} Showing the last version loaded.`}
            />
          ) : null}
          {planCards.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </View>
      ) : tracking.error ? (
        <PlanStateCard
          tone="danger"
          title="Couldn't load your plans"
          message={`${tracking.error.message} Pull down to try again.`}
        />
      ) : (
        <PlanStateCard
          title="No plans assigned yet"
          message="Your coach hasn't assigned a workout or diet plan. Pull down to check again."
        />
      )}

      <ThemedView type="backgroundElement" style={[styles.updateCard, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Today&apos;s update</ThemedText>

        <View style={styles.updateRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Physique update
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shownPhoto ? 'Change physique photo' : 'Upload physique photo'}
            onPress={() => void pickPhysiquePhoto()}
            disabled={isUploadingPhoto}
            style={[styles.uploadButton, { borderColor: theme.border }]}>
            {isUploadingPhoto ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <ThemedText type="meta">{shownPhoto ? 'Change image' : 'Upload'}</ThemedText>
            )}
          </Pressable>
        </View>

        {shownPhoto ? (
          <Image
            source={{ uri: shownPhoto }}
            accessibilityLabel="Physique photo for today"
            style={[styles.previewImage, { backgroundColor: theme.surfaceSunken }]}
          />
        ) : null}

        <View style={styles.updateRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Weight update
          </ThemedText>
          <TextInput
            value={shownWeight}
            onChangeText={setWeightValue}
            placeholder="Add value"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              styles.weightInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceSunken },
            ]}
          />
        </View>

        <View style={[styles.saveRow, { borderTopColor: theme.border }]}>
          {savedMessage ? (
            <ThemedText
              type="small"
              themeColor={savedMessage.startsWith('Saved') ? 'success' : 'warning'}
              style={styles.saveMessage}
              numberOfLines={2}>
              {savedMessage}
            </ThemedText>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={handleSaveUpdate}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.accent, opacity: isSaving ? 0.6 : pressed ? 0.8 : 1 },
            ]}>
            <ThemedText type="smallBold" themeColor="onAccent">
              {isSaving ? 'Saving…' : 'Save update'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>

      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          History
        </ThemedText>
      </View>

      <Pressable onPress={() => router.push('/history')}>
        <ThemedView type="backgroundElement" style={[styles.historyCard, { borderColor: theme.border }]}>
          <View style={styles.historyTopRow}>
            <ThemedText type="smallBold">History</ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Open
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            View previous weigh-ins, physique updates, and coaching notes.
          </ThemedText>
        </ThemedView>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  headline: {
    fontSize: 34,
    lineHeight: 40,
  },
  updateCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  updateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.half,
    gap: Spacing.two,
  },
  label: {
    flex: 1,
  },
  uploadButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 110,
    borderRadius: Spacing.two,
    marginTop: -Spacing.half,
  },
  input: {
    minWidth: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
    fontSize: 12,
  },
  weightInput: {
    width: 96,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveMessage: {
    flex: 1,
  },
  saveButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.one,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    marginBottom: Spacing.one,
  },
  cards: {
    gap: Spacing.three,
  },
});
