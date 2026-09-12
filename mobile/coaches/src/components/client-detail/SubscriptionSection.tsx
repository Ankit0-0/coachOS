import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { longDateLabel } from '@/lib/dates';
import { subscriptionApi, type Subscription } from '@/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/** YYYY-MM-DD, `monthsAhead` months from today. */
function dateInput(monthsAhead: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function statusLabel(subscription: Subscription): string {
  if (subscription.status === 'CANCELLED') return 'Cancelled';
  if (subscription.status === 'EXPIRED') return 'Expired';
  return subscription.daysRemaining === 0
    ? 'Ends today'
    : `${subscription.daysRemaining} ${subscription.daysRemaining === 1 ? 'day' : 'days'} left`;
}

export function SubscriptionSection({ clientId }: { clientId: string }) {
  const theme = useTheme();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    subscriptionApi
      .list(clientId)
      .then(setSubscriptions)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [clientId]);

  useEffect(load, [load]);

  const openForm = () => {
    // Prefilled with the obvious next month so a renewal is one tap.
    setStartDate(dateInput(0));
    setEndDate(dateInput(1));
    setNotes('');
    setFormError(null);
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      setFormError('Enter both a start and an end date.');
      return;
    }
    if (endDate <= startDate) {
      setFormError('The end date has to be after the start date.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await subscriptionApi.create(clientId, {
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setIsAdding(false);
      load();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Section title="Subscription">
        <Card>
          <ActivityIndicator color={theme.textSecondary} />
        </Card>
      </Section>
    );
  }

  const [current, ...past] = subscriptions;

  return (
    <Section title="Subscription" actionLabel={isAdding ? undefined : 'Add period'} onActionPress={isAdding ? undefined : openForm}>
      {isAdding ? (
        <Card style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Start date
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              End date
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Notes (optional)
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Paid by bank transfer"
              placeholderTextColor={theme.textMuted}
              editable={!isSaving}
            />
          </View>

          <ThemedText type="meta">
            Adding a period ends the one running now. It never changes what this client can see.
          </ThemedText>

          {formError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="small" themeColor="danger">
                {formError}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.formActions}>
            <View style={styles.formAction}>
              <Button label="Cancel" variant="secondary" onPress={() => setIsAdding(false)} disabled={isSaving} fullWidth />
            </View>
            <View style={styles.formAction}>
              <Button label="Save period" onPress={handleSave} loading={isSaving} fullWidth />
            </View>
          </View>
        </Card>
      ) : null}

      {current ? (
        <Card style={styles.current}>
          <View style={styles.currentHeader}>
            <ThemedText type="smallBold">
              {longDateLabel(current.startDate)} – {longDateLabel(current.endDate)}
            </ThemedText>
            <Pill label={statusLabel(current)} tone={current.status === 'ACTIVE' ? 'accent' : 'neutral'} />
          </View>
          {current.notes ? (
            <ThemedText type="small" themeColor="textSecondary">
              {current.notes}
            </ThemedText>
          ) : null}
        </Card>
      ) : (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            No subscription on record. This client has open-ended access — add a period to start tracking one.
          </ThemedText>
        </Card>
      )}

      {past.length > 0 ? (
        <Card padded={false} style={styles.pastCard}>
          {past.map((subscription, index) => (
            <View
              key={subscription.id}
              style={[
                styles.pastRow,
                index < past.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}>
              <ThemedText type="small" themeColor="textSecondary">
                {longDateLabel(subscription.startDate)} – {longDateLabel(subscription.endDate)}
              </ThemedText>
              <ThemedText type="meta">
                {subscription.status === 'CANCELLED' ? 'Cancelled' : 'Ended'}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  formAction: {
    flex: 1,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  current: {
    gap: Spacing.two,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  pastCard: {
    paddingHorizontal: Spacing.three,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
