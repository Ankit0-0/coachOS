import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ClientListItem } from '@/components/clients/ClientListItem';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, type CoachInvite } from '@/lib/api';

const PREVIEW_COUNT = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function ClientsSection() {
  const theme = useTheme();
  const router = useRouter();
  const [clients, setClients] = useState<CoachInvite[]>([]);
  const [pending, setPending] = useState<CoachInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  /** Null means an open-ended relationship: no subscription record is created. */
  const [durationMonths, setDurationMonths] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  // Inline rather than Alert, which is a no-op on React Native Web — routed
  // through Alert, none of these messages appeared in a browser at all.
  const [formError, setFormError] = useState<string | null>(null);

  const loadInvites = useCallback(() => {
    Promise.all([coachInviteApi.list('ACCEPTED'), coachInviteApi.list('PENDING')])
      .then(([accepted, pendingInvites]) => {
        setClients(accepted);
        setPending(pendingInvites);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites]),
  );

  const handleInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError('Add the email address your client signs in with.');
      return;
    }

    try {
      setIsSending(true);
      setFormError(null);
      await coachInviteApi.create(trimmed, durationMonths ?? undefined);
      setEmail('');
      setDurationMonths(null);
      loadInvites();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const preview = clients.slice(0, PREVIEW_COUNT);
  const hasMore = clients.length > PREVIEW_COUNT;

  return (
    <View style={styles.container}>
      <Section
        title={clients.length > 0 ? `Roster (${clients.length})` : 'Roster'}
        {...(hasMore ? { actionLabel: 'View all', onActionPress: () => router.push('/clients') } : {})}>
        {isLoading ? (
          <ActivityIndicator color={theme.textSecondary} />
        ) : preview.length === 0 ? (
          <Card>
            <ThemedText type="smallBold">No clients yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Invite someone below and they&apos;ll appear here once they accept.
            </ThemedText>
          </Card>
        ) : (
          <Card padded={false}>
            {preview.map((invite, index) => (
              <ClientListItem
                key={invite.id}
                clientId={invite.clientId ?? invite.client?.id ?? ''}
                name={invite.client?.name ?? invite.clientEmail}
                email={invite.client?.email ?? invite.clientEmail}
                subscriptionStatus={invite.subscriptionStatus}
                divider={index < preview.length - 1}
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title="Invite a client">
        <Card>
          <View style={styles.inviteRow}>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="client@example.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              editable={!isSending}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button label="Send" onPress={handleInvite} loading={isSending} />
          </View>

          <View style={styles.durationBlock}>
            <ThemedText type="label" themeColor="textSecondary">
              Subscription length
            </ThemedText>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((option) => {
                const isSelected = durationMonths === option.value;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    onPress={() => setDurationMonths(option.value)}
                    disabled={isSending}
                    style={[
                      styles.durationChip,
                      { borderColor: isSelected ? theme.accent : theme.border },
                      isSelected && { backgroundColor: theme.accentSoft },
                    ]}>
                    <ThemedText type="meta" themeColor={isSelected ? 'accent' : 'textSecondary'}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {formError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="small" themeColor="danger">
                {formError}
              </ThemedText>
            </View>
          ) : null}

          {pending.length > 0 ? (
            <View style={styles.pendingList}>
              {pending.map((invite) => (
                <View key={invite.id} style={styles.pendingRow}>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.pendingEmail}>
                    {invite.clientEmail}
                  </ThemedText>
                  <Pill label="Awaiting reply" tone="warning" />
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </Section>
    </View>
  );
}

/** A selected chip is a genuine active state, which is what the accent is for. */
const DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: '1 month', value: 1 },
  { label: '3 months', value: 3 },
  { label: '6 months', value: 6 },
  { label: '12 months', value: 12 },
  { label: 'No fixed period', value: null },
];

const styles = StyleSheet.create({
  durationBlock: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  durationChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  container: {
    gap: Spacing.four,
  },
  inviteRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 48,
  },
  pendingList: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pendingEmail: {
    flexShrink: 1,
  },
});
