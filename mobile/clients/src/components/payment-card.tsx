import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clientSubscriptionApi, type ClientSubscription } from '@/lib/api';
import { longDateLabel } from '@/lib/dates';
import { formatInr, paymentChip, receiptText, upiPayUrl } from '@/lib/payment';
import { TextField } from '@coachos/theme';

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** The API sends @db.Date columns as UTC midnight; only the calendar date means anything. */
function dayLabel(value: string): string {
  return longDateLabel(value.slice(0, 10));
}

/**
 * This period's fee: what's owed and a Pay with UPI button that opens the
 * client's UPI app with the coach and amount filled in, then "I've paid" so
 * the coach can confirm. The money goes straight to the coach; CoachFolio
 * never holds it, so only the coach can mark it received.
 */
export function PaymentCard({
  subscription,
  clientName,
  onChanged,
}: {
  subscription: ClientSubscription;
  clientName: string;
  onChanged: (updated: ClientSubscription) => void;
}) {
  const theme = useTheme();
  const [isReporting, setIsReporting] = useState(false);
  const [reference, setReference] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const amount = subscription.amountInr;
  const chip = paymentChip(subscription.paymentStatus);
  if (amount === null || !chip) return null;

  const coach = firstName(subscription.coach.name);
  const upiId = subscription.coach.upiId;
  const period = `${dayLabel(subscription.startDate)} – ${dayLabel(subscription.endDate)}`;

  const openUpi = async () => {
    if (!upiId) return;
    setMessage(null);
    try {
      await Linking.openURL(
        upiPayUrl({ upiId, payeeName: subscription.coach.name, amountInr: amount, note: `CoachFolio ${period}` }),
      );
    } catch {
      setMessage(`No UPI app opened. Pay ${formatInr(amount)} to ${upiId} from any UPI app, then tap I’ve paid.`);
    }
  };

  const sendReport = async () => {
    setIsSending(true);
    setMessage(null);
    try {
      onChanged(await clientSubscriptionApi.reportPaid(subscription.id, reference.trim() || undefined));
      setIsReporting(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That didn’t go through. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const shareReceipt = async () => {
    if (!subscription.receiptNumber || !subscription.paidAt) return;
    try {
      await Share.share({
        message: receiptText({
          receiptNumber: subscription.receiptNumber,
          coachName: subscription.coach.name,
          clientName,
          amountInr: amount,
          periodLabel: period,
          paidOn: longDateLabel(subscription.paidAt),
        }),
      });
    } catch {
      setMessage(`Sharing isn’t available here. Your receipt number is ${subscription.receiptNumber}.`);
    }
  };

  const status = subscription.paymentStatus;
  const owes = status === 'DUE' || status === 'OVERDUE';

  return (
    <Section title="Payment">
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="subtitle">{formatInr(amount)}</ThemedText>
            <ThemedText type="meta">For {period}</ThemedText>
          </View>
          <Chip label={chip.label} tone={chip.tone} />
        </View>

        {owes ? (
          upiId ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Pay {coach} directly with UPI. The money goes straight to them.
              </ThemedText>
              <View style={[styles.upiRow, { backgroundColor: theme.surfaceInset }]}>
                <ThemedText type="meta">UPI ID</ThemedText>
                <ThemedText type="smallBold" selectable>
                  {upiId}
                </ThemedText>
              </View>
              <Button label="Pay with UPI" onPress={() => void openUpi()} />
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Ask {coach} how they’d like to be paid. Once you have, tap I’ve paid.
            </ThemedText>
          )
        ) : status === 'REPORTED' ? (
          <ThemedText type="small" themeColor="textSecondary">
            You told {coach} you paid
            {subscription.clientReportedPaidAt ? ` on ${longDateLabel(subscription.clientReportedPaidAt)}` : ''}. They’ll
            confirm once they see it.
          </ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {coach} confirmed it{subscription.paidAt ? ` on ${longDateLabel(subscription.paidAt)}` : ''} · Receipt{' '}
            {subscription.receiptNumber}
          </ThemedText>
        )}

        {owes ? (
          isReporting ? (
            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                UPI reference (optional)
              </ThemedText>
              <TextField
                value={reference}
                onChangeText={setReference}
                placeholder="12-digit UTR from your UPI app"
                keyboardType="number-pad"
                maxLength={64}
                editable={!isSending}
              />
              <ThemedText type="meta">It helps {coach} find your payment.</ThemedText>
              <View style={styles.actions}>
                <Button label={`Tell ${coach} I’ve paid`} loading={isSending} onPress={() => void sendReport()} />
                <Button label="Cancel" variant="ghost" disabled={isSending} onPress={() => setIsReporting(false)} />
              </View>
            </View>
          ) : (
            <Button label="I’ve paid" variant="secondary" onPress={() => setIsReporting(true)} />
          )
        ) : status === 'PAID' ? (
          <Button label="Share receipt" variant="secondary" onPress={() => void shareReceipt()} />
        ) : null}

        {message ? (
          <ThemedText type="small" themeColor="warning">
            {message}
          </ThemedText>
        ) : null}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  upiRow: {
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    gap: Spacing.half,
  },
  field: {
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
