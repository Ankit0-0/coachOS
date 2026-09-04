import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { assignmentApi, planApi, type Plan, type PlanAssignment, type PlanType } from '@/lib/api';
import { planStatsLabel } from '@/lib/plan-format';

type ClientDetailScreenProps = {
  clientId: string;
  name: string;
  email: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ClientDetailScreen({ clientId, name, email }: ClientDetailScreenProps) {
  const theme = useTheme();
  const [assignments, setAssignments] = useState<PlanAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerType, setPickerType] = useState<PlanType | null>(null);
  const [pickerPlans, setPickerPlans] = useState<{ own: Plan[]; defaults: Plan[] } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadAssignments = useCallback(() => {
    assignmentApi
      .listForClient(clientId)
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [loadAssignments]),
  );

  const activeWorkout = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'WORKOUT');
  const activeDiet = assignments.find((a) => a.status === 'ACTIVE' && a.plan.type === 'DIET');
  const history = assignments.filter((a) => a.id !== activeWorkout?.id && a.id !== activeDiet?.id);

  const openPicker = async (type: PlanType) => {
    if (pickerType === type) {
      setPickerType(null);
      return;
    }
    setPickerType(type);
    setPickerPlans(null);
    try {
      setPickerPlans(await planApi.list(type));
    } catch (error) {
      Alert.alert('Could not load plans', errorMessage(error));
      setPickerType(null);
    }
  };

  const handleAssign = async (planId: string) => {
    try {
      setIsAssigning(true);
      await assignmentApi.create({ clientId, planId });
      setPickerType(null);
      loadAssignments();
    } catch (error) {
      Alert.alert('Could not assign plan', errorMessage(error));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <ScreenScaffold includeBottomTabInset>
      <DetailHeader title={name} subtitle={email} />

      {isLoading ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <>
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Current
            </ThemedText>

            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">Workout</ThemedText>
                <Pressable onPress={() => openPicker('WORKOUT')}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    {activeWorkout ? 'Change' : 'Assign'}
                  </ThemedText>
                </Pressable>
              </View>
              {activeWorkout ? (
                <>
                  <ThemedText type="small">{activeWorkout.plan.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {planStatsLabel(activeWorkout.plan)}
                  </ThemedText>
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  No active workout plan.
                </ThemedText>
              )}
            </ThemedView>

            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">Diet</ThemedText>
                <Pressable onPress={() => openPicker('DIET')}>
                  <ThemedText type="small" style={{ color: theme.accent }}>
                    {activeDiet ? 'Change' : 'Assign'}
                  </ThemedText>
                </Pressable>
              </View>
              {activeDiet ? (
                <>
                  <ThemedText type="small">{activeDiet.plan.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {planStatsLabel(activeDiet.plan)}
                  </ThemedText>
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  No active diet plan.
                </ThemedText>
              )}
            </ThemedView>
          </View>

          {pickerType ? (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="smallBold">Choose a {pickerType === 'WORKOUT' ? 'workout' : 'diet'} plan</ThemedText>
              {!pickerPlans ? (
                <ActivityIndicator color={theme.textSecondary} />
              ) : pickerPlans.own.length === 0 && pickerPlans.defaults.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No plans available yet — create one from Saved Plans.
                </ThemedText>
              ) : (
                <View style={styles.pickerList}>
                  {[...pickerPlans.own, ...pickerPlans.defaults].map((plan) => (
                    <Pressable
                      key={plan.id}
                      style={[styles.pickerRow, { borderColor: theme.border }]}
                      disabled={isAssigning}
                      onPress={() => handleAssign(plan.id)}>
                      <View style={styles.pickerRowText}>
                        <ThemedText type="small">{plan.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {planStatsLabel(plan)}
                          {plan.isDefault ? ' • Default' : ''}
                        </ThemedText>
                      </View>
                      {isAssigning ? <ActivityIndicator color={theme.textSecondary} size="small" /> : null}
                    </Pressable>
                  ))}
                </View>
              )}
            </ThemedView>
          ) : null}

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              History
            </ThemedText>
            {history.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No previous assignments yet.
              </ThemedText>
            ) : (
              history.map((assignment) => (
                <ThemedView key={assignment.id} type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
                  <View style={styles.cardHeader}>
                    <ThemedText type="small">{assignment.plan.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {assignment.status}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {planStatsLabel(assignment.plan)}
                  </ThemedText>
                </ThemedView>
              ))
            )}
          </View>
        </>
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerList: {
    gap: Spacing.two,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  pickerRowText: {
    flex: 1,
    gap: Spacing.half,
  },
});
