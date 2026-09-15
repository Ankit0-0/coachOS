import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Pill } from '@/components/ui/pill';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, assignmentApi, planApi, type Plan, type PlanType } from '@/lib/api';
import { planStats, planSummary } from '@/lib/plan-format';

type PlanPickerModalProps = {
  /** The plan type being assigned; null keeps the modal closed. */
  type: PlanType | null;
  clientId: string;
  /** The plan the client is currently on for this type, marked and not re-assignable. */
  currentPlanId: string | null;
  onClose: () => void;
  /** Awaited after a successful assignment, so the page underneath can refresh. */
  onAssigned: () => Promise<void> | void;
};

/**
 * API errors carry only a status, so the generic "Request failed with status
 * 500." is all there is to show unless the meaningful ones are named here.
 */
function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 423) return 'Your account is waiting for approval, so you can’t assign plans yet.';
    if (error.status === 403) return 'This client isn’t on your roster any more, so you can’t assign them a plan.';
    if (error.status === 404) return 'That plan no longer exists. It may have just been deleted.';
    if (error.status === 0) return error.message;
  }
  return fallback;
}

export function PlanPickerModal({ type, clientId, currentPlanId, onClose, onAssigned }: PlanPickerModalProps) {
  const theme = useTheme();
  const [plans, setPlans] = useState<{ own: Plan[]; defaults: Plan[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** The plan whose Assign was pressed; while set, every Assign is disabled. */
  const [assigningPlanId, setAssigningPlanId] = useState<string | null>(null);
  /**
   * Shown under the row that failed, not at the top of the sheet: the coach
   * pressed a button that may be scrolled far down the list, and that's where
   * they're looking.
   */
  const [assignError, setAssignError] = useState<{
    planId: string;
    message: string;
  } | null>(null);
  /** Bumped by "Try again" to refetch without closing the sheet. */
  const [reloadCount, setReloadCount] = useState(0);

  // Reset when the sheet opens for a (different) type — during render rather
  // than in an effect, so the old list never flashes up first.
  const [shownType, setShownType] = useState(type);
  if (type !== shownType) {
    setShownType(type);
    setPlans(null);
    setLoadError(null);
    setAssignError(null);
  }

  // Fresh each time the sheet opens, so a plan created a moment ago is there.
  useEffect(() => {
    if (!type) return;
    let cancelled = false;
    planApi
      .list(type)
      .then((result) => {
        if (!cancelled) setPlans(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Could not load plans.'));
      });
    // A reopen for the other type mustn't be overwritten by this response.
    return () => {
      cancelled = true;
    };
  }, [type, reloadCount]);

  const retryLoad = () => {
    setPlans(null);
    setLoadError(null);
    setReloadCount((count) => count + 1);
  };

  const handleAssign = async (plan: Plan) => {
    if (assigningPlanId) return;
    setAssigningPlanId(plan.id);
    setAssignError(null);
    try {
      await assignmentApi.create({ clientId, planId: plan.id });
      onClose();
      await onAssigned();
    } catch (error) {
      // Stay open: the coach should see why, not be left guessing.
      setAssignError({
        planId: plan.id,
        message: errorMessage(error, 'Could not assign this plan. Please try again.'),
      });
    } finally {
      setAssigningPlanId(null);
    }
  };

  const noun = type === 'DIET' ? 'diet' : 'workout';

  const renderGroup = (title: string, groupPlans: Plan[], emptyMessage: string) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="meta">{groupPlans.length}</ThemedText>
      </View>
      {groupPlans.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyMessage}
        </ThemedText>
      ) : (
        groupPlans.map((plan) => {
          const stats = planStats(plan);
          const isCurrent = plan.id === currentPlanId;
          const rowError = assignError?.planId === plan.id ? assignError.message : null;
          return (
            <View key={plan.id} style={styles.rowWrap}>
              <Card variant="inset" style={styles.row}>
                <View style={styles.rowCopy}>
                  <View style={styles.titleRow}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.planTitle}>
                      {plan.title}
                    </ThemedText>
                    {isCurrent ? <Pill label="Current" tone="accent" /> : null}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {planSummary(plan)}
                  </ThemedText>
                  <View style={styles.stats}>
                    <ThemedText type="meta" themeColor="textSecondary">
                      {stats.primary}
                    </ThemedText>
                    <ThemedText type="meta">{stats.secondary}</ThemedText>
                  </View>
                </View>
                {isCurrent ? null : (
                  <Button
                    label="Assign"
                    variant="secondary"
                    size="sm"
                    accessibilityLabel={`Assign ${plan.title}`}
                    onPress={() => void handleAssign(plan)}
                    loading={assigningPlanId === plan.id}
                    disabled={assigningPlanId !== null}
                  />
                )}
              </Card>
              {rowError ? (
                <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
                  <ThemedText type="small" themeColor="danger">
                    {rowError}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <Modal visible={type !== null} onClose={onClose} title={`Assign ${noun} plan`}>
      {loadError ? (
        <View style={styles.state}>
          <ThemedText type="small" themeColor="danger">
            {loadError}
          </ThemedText>
          <Button label="Try again" variant="secondary" size="sm" onPress={retryLoad} />
        </View>
      ) : !plans ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : plans.own.length === 0 && plans.defaults.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          There are no {noun} plans to assign yet. Create one from the Plans tab, then come back here.
        </ThemedText>
      ) : (
        <>
          {renderGroup(
            'Your plans',
            plans.own,
            `You haven’t built a ${noun} plan yet — create one from the Plans tab.`,
          )}
          {renderGroup('Default plans', plans.defaults, `No default ${noun} plans are available.`)}
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  rowWrap: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  rowCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planTitle: {
    flexShrink: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  state: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
