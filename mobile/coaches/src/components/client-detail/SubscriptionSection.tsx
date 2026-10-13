import { useFocusEffect } from 'expo-router';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import type { RefreshHandle } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { longDateLabel } from '@/lib/dates';
import { subscriptionApi, type Subscription } from '@/lib/api';
import { formatInr, parseFee, paymentChip, receiptText } from '@/lib/payment';
import { Checkbox, TextField } from '@coachos/theme';

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

const FEE_ERROR = 'Enter the fee in whole rupees, like 4500, or leave it blank.';

export function SubscriptionSection({
  clientId,
  clientName,
  ref,
}: {
  clientId: string;
  clientName: string;
  ref?: Ref<RefreshHandle>;
}) {
  const theme = useTheme();
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [fee, setFee] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Setting a fee on the current period, which may have been created without one. */
  const [feeDraft, setFeeDraft] = useState<string | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubscriptions(await subscriptionApi.list(clientId));
    } catch {
      // As before: keep whatever is on screen.
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Lets the client detail screen's pull-to-refresh wait for this section too.
  useImperativeHandle(ref, () => ({ reload: load }), [load]);

  const openForm = () => {
    // Prefilled with the obvious next month so a renewal is one tap.
    setStartDate(dateInput(0));
    setEndDate(dateInput(1));
    setNotes('');
    // The last fee is the likely next one.
    setFee(subscriptions[0]?.amountInr ? String(subscriptions[0].amountInr) : '');
    setAlreadyPaid(false);
    setFormError(null);
    setIsAdding(true);
  };

  /** One payment action at a time: mark paid, not received, or set the fee. */
  const runPaymentAction = async (action: () => Promise<unknown>) => {
    setIsUpdatingPayment(true);
    setPaymentError(null);
    try {
      await action();
      await load();
    } catch (error) {
      setPaymentError(errorMessage(error));
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const saveFee = (subscription: Subscription) => {
    const amount = parseFee(feeDraft ?? '');
    if (amount === undefined) {
      setPaymentError(FEE_ERROR);
      return;
    }
    void runPaymentAction(async () => {
      await subscriptionApi.update(clientId, subscription.id, { amountInr: amount });
      setFeeDraft(null);
    });
  };

  const shareReceipt = async (subscription: Subscription) => {
    if (!subscription.receiptNumber || !subscription.amountInr || !subscription.paidAt) return;
    try {
      await Share.share({
        message: receiptText({
          receiptNumber: subscription.receiptNumber,
          coachName: user?.name ?? 'Your coach',
          clientName,
          amountInr: subscription.amountInr,
          periodLabel: `${longDateLabel(subscription.startDate)} – ${longDateLabel(subscription.endDate)}`,
          paidOn: longDateLabel(subscription.paidAt),
        }),
      });
    } catch {
      setPaymentError('Sharing isn’t available here. The receipt number is ' + subscription.receiptNumber + '.');
    }
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
    const amount = parseFee(fee);
    if (amount === undefined) {
      setFormError(FEE_ERROR);
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      await subscriptionApi.create(clientId, {
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(amount !== null ? { amountInr: amount, alreadyPaid } : {}),
      });
      setIsAdding(false);
      void load();
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

  /** The fee, where it stands, and what the coach can do about it. */
  const renderPayment = (subscription: Subscription) => {
    const chip = paymentChip(subscription.paymentStatus);
    const busy = isUpdatingPayment;
    const markPaid = (paid: boolean) =>
      void runPaymentAction(() => subscriptionApi.setPayment(clientId, subscription.id, paid));

    if (subscription.amountInr === null) {
      if (subscription.status === 'CANCELLED') return null;
      return feeDraft === null ? (
        <View style={styles.paymentActions}>
          <Button label="Set fee" variant="secondary" size="sm" onPress={() => setFeeDraft('')} />
        </View>
      ) : (
        <View style={styles.field}>
          <ThemedText type="label" themeColor="textSecondary">
            Fee in ₹
          </ThemedText>
          <View style={styles.inlineRow}>
            <TextField
              style={styles.inlineInput}
              value={feeDraft}
              onChangeText={setFeeDraft}
              placeholder="e.g. 4500"
              keyboardType="number-pad"
              editable={!busy}
            />
            <Button label="Save" size="sm" loading={busy} onPress={() => saveFee(subscription)} />
            <Button label="Cancel" variant="ghost" size="sm" disabled={busy} onPress={() => setFeeDraft(null)} />
          </View>
          {paymentError ? (
            <ThemedText type="small" themeColor="danger">
              {paymentError}
            </ThemedText>
          ) : null}
        </View>
      );
    }

    return (
      <View style={[styles.payment, { borderTopColor: theme.border }]}>
        <View style={styles.currentHeader}>
          <ThemedText type="heading">{formatInr(subscription.amountInr)}</ThemedText>
          {chip ? <Chip label={chip.label} tone={chip.tone} /> : null}
        </View>

        {subscription.paymentStatus === 'REPORTED' && subscription.clientReportedPaidAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            {clientName} says they paid on {longDateLabel(subscription.clientReportedPaidAt)}
            {subscription.paymentReference ? ` (UPI ref ${subscription.paymentReference})` : ''}. Check your UPI app,
            then confirm.
          </ThemedText>
        ) : subscription.paymentStatus === 'PAID' && subscription.paidAt ? (
          <ThemedText type="small" themeColor="textSecondary">
            Paid on {longDateLabel(subscription.paidAt)} · Receipt {subscription.receiptNumber}
          </ThemedText>
        ) : null}

        {paymentError ? (
          <ThemedText type="small" themeColor="danger">
            {paymentError}
          </ThemedText>
        ) : null}

        <View style={styles.paymentActions}>
          {subscription.paymentStatus === 'REPORTED' ? (
            <>
              <Button label="Confirm payment" size="sm" loading={busy} onPress={() => markPaid(true)} />
              <Button label="Not received" variant="ghost" size="sm" disabled={busy} onPress={() => markPaid(false)} />
            </>
          ) : subscription.paymentStatus === 'PAID' ? (
            <>
              <Button label="Share receipt" variant="secondary" size="sm" onPress={() => void shareReceipt(subscription)} />
              <Button label="Mark unpaid" variant="ghost" size="sm" disabled={busy} onPress={() => markPaid(false)} />
            </>
          ) : (
            <Button label="Mark paid" variant="secondary" size="sm" loading={busy} onPress={() => markPaid(true)} />
          )}
        </View>
      </View>
    );
  };

  return (
    <Section title="Subscription" actionLabel={isAdding ? undefined : 'Add period'} onActionPress={isAdding ? undefined : openForm}>
      {isAdding ? (
        <Card style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Start date
            </ThemedText>
            <TextField
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              End date
            </ThemedText>
            <TextField
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              editable={!isSaving}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Notes (optional)
            </ThemedText>
            <TextField
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. 12 sessions, online"
              editable={!isSaving}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Fee in ₹ (optional)
            </ThemedText>
            <TextField
              value={fee}
              onChangeText={setFee}
              placeholder="e.g. 4500"
              keyboardType="number-pad"
              editable={!isSaving}
            />
            <ThemedText type="meta">
              With a fee, your client gets a Pay with UPI button and reminders when it’s due.
            </ThemedText>
          </View>

          {fee.trim() ? (
            <Pressable
              accessibilityRole="checkbox"
              aria-checked={alreadyPaid}
              onPress={() => setAlreadyPaid((current) => !current)}
              style={[styles.checkRow, { backgroundColor: theme.surfaceInset }]}>
              <Checkbox checked={alreadyPaid} accessibilityLabel="Already paid" />
              <ThemedText type="small" style={styles.checkText}>
                Already paid (cash, or before CoachFolio), so no reminder goes out
              </ThemedText>
            </Pressable>
          ) : null}

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
          {renderPayment(current)}
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
                {[
                  subscription.amountInr
                    ? `${formatInr(subscription.amountInr)} ${subscription.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`
                    : null,
                  subscription.status === 'CANCELLED' ? 'Cancelled' : 'Ended',
                ]
                  .filter(Boolean)
                  .join(' · ')}
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
  checkRow: {
    borderRadius: Radii.md,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  checkText: {
    flex: 1,
  },
  payment: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  paymentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  inlineInput: {
    flex: 1,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
