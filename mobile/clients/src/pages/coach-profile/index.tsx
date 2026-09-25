import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { CLIENTS_ICON, EXPERIENCE_ICON, StatChip } from '@/components/explore/StatChip';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip, Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, coachRequestApi, exploreApi, type DirectoryCoach } from '@/lib/api';
import { requestSwitchWarning } from '@/lib/coach-switch';
import { confirmDestructive } from '@/lib/confirm';
import { clientCountLabel, experienceLabel, relationshipPill } from '@/lib/explore';
import { TextField } from '@coachos/theme';

const MAX_MESSAGE_LENGTH = 500;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

type Notice = { tone: 'danger' | 'info'; text: string };

export function CoachProfileScreen({ coachId }: { coachId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const [coach, setCoach] = useState<DirectoryCoach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Set when the coach can't be shown at all — unlisted since, or never listed. */
  const [isGone, setIsGone] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      setCoach(await exploreApi.getCoach(coachId));
      setIsGone(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setIsGone(true);
        setCoach(null);
      } else {
        setNotice({ tone: 'danger', text: errorMessage(error) });
      }
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { isRefreshing, refresh } = useRefresh(load);

  /**
   * The API answers a stale action with a bare 409 or 404, and the directory
   * already reports the current relationship — so the recovery is always the
   * same: reload, and say that things moved on.
   */
  async function recoverFrom(error: unknown) {
    if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
      await load();
      setNotice({ tone: 'info', text: 'This changed since you opened the profile. Here is where things stand now.' });
    } else {
      setNotice({ tone: 'danger', text: errorMessage(error) });
    }
  }

  const handleRequest = async () => {
    if (!coach) return;
    // If this coach accepts, the current one is ended, so ask before sending.
    if (coach.currentCoach) {
      const confirmed = await confirmDestructive({
        title: 'Switch coach?',
        message: requestSwitchWarning(coach.currentCoach, coach.name),
        confirmLabel: 'Send request',
      });
      if (!confirmed) return;
    }
    setIsSubmitting(true);
    setNotice(null);
    try {
      const trimmed = message.trim();
      await coachRequestApi.create({ coachId: coach.id, ...(trimmed ? { message: trimmed } : {}) });
      setMessage('');
      await load();
      setNotice({ tone: 'info', text: `Request sent. ${coach.name} will see it in their app.` });
    } catch (error) {
      await recoverFrom(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!coach?.pendingRequestId) return;
    setIsSubmitting(true);
    setNotice(null);
    try {
      await coachRequestApi.cancel(coach.pendingRequestId);
      await load();
      setNotice({ tone: 'info', text: 'Request cancelled.' });
    } catch (error) {
      await recoverFrom(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <DetailHeader title="Coach" subtitle="Loading…" />
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (isGone || !coach) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <DetailHeader title="Coach" subtitle="Not available" />
        <Card style={styles.stateCard}>
          <ThemedText type="smallBold">
            {isGone ? 'This coach is no longer listed' : 'Couldn’t load this coach'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isGone
              ? 'They may have stopped taking new clients through Explore.'
              : (notice?.text ?? 'Check your connection and try again.')}
          </ThemedText>
          <Button label={isGone ? 'Back to Explore' : 'Try again'} variant="secondary" onPress={() => (isGone ? router.back() : void load())} />
        </Card>
      </ScreenScaffold>
    );
  }

  const pill = relationshipPill(coach.relationship);
  const experience = experienceLabel(coach.yearsExperience);
  const clients = clientCountLabel(coach);

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
      <DetailHeader title="Coach profile" subtitle="Explore" />

      <View style={styles.identity}>
        <Avatar name={coach.name} size="lg" imageUrl={coach.avatarUrl} />
        <View style={styles.identityCopy}>
          <ThemedText type="heading">{coach.name}</ThemedText>
          {pill ? <Pill label={pill.label} tone={pill.tone} /> : null}
          {experience || clients ? (
            <View style={styles.stats}>
              {experience ? <StatChip icon={EXPERIENCE_ICON} label={experience} /> : null}
              {clients ? <StatChip icon={CLIENTS_ICON} label={clients} /> : null}
            </View>
          ) : null}
        </View>
      </View>

      {coach.specialties.length > 0 ? (
        <Section title="Specialties">
          <View style={styles.specialties}>
            {coach.specialties.map((specialty) => (
              <Chip key={specialty} label={specialty} tone="green" />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="About">
        <Card>
          <ThemedText type="small" themeColor={coach.bio ? 'textPrimary' : 'textSecondary'}>
            {coach.bio ?? `${coach.name} hasn’t written a bio yet.`}
          </ThemedText>
        </Card>
      </Section>

      <Section title="Coaching">
        <Card style={styles.actionCard}>
          {coach.relationship === 'COACHING' ? (
            <>
              <ThemedText type="smallBold">{coach.name} is your coach</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Your plans and check-ins are already shared with them.
              </ThemedText>
              <Button label="Open your coach" variant="secondary" onPress={() => router.push('/my-coach')} fullWidth />
            </>
          ) : coach.relationship === 'INVITED' ? (
            <>
              <ThemedText type="smallBold">{coach.name} has already invited you</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                There&apos;s no need to send a request — accept their invite to get started.
              </ThemedText>
              <Button label="Review invite" onPress={() => router.push('/my-coach')} fullWidth />
            </>
          ) : coach.relationship === 'REQUESTED' ? (
            <>
              <ThemedText type="smallBold">Request sent</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Waiting for {coach.name} to respond. Once they accept, they&apos;ll be at the top of Home.
              </ThemedText>
              <Button
                label="Cancel request"
                variant="secondary"
                onPress={() => void handleCancel()}
                loading={isSubmitting}
                fullWidth
              />
            </>
          ) : (
            <>
              <ThemedText type="smallBold">Ask {coach.name} to coach you</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                They&apos;ll see your name and email with your request, and can accept or decline.
              </ThemedText>
              <View style={styles.field}>
                <ThemedText type="label" themeColor="textSecondary">
                  Message (optional)
                </ThemedText>
                <TextField
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Your goals, experience, or when you can train"
                  multiline
                  maxLength={MAX_MESSAGE_LENGTH}
                  editable={!isSubmitting}
                />
                <ThemedText type="meta" style={styles.counter}>
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </ThemedText>
              </View>
              <Button label="Request to join" onPress={() => void handleRequest()} loading={isSubmitting} fullWidth />
            </>
          )}

          {notice ? (
            <View
              style={[
                styles.notice,
                { backgroundColor: notice.tone === 'danger' ? theme.dangerSoft : theme.surfaceInset },
              ]}>
              <ThemedText type="small" themeColor={notice.tone === 'danger' ? 'danger' : 'textSecondary'}>
                {notice.text}
              </ThemedText>
            </View>
          ) : null}
        </Card>
      </Section>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityCopy: {
    flex: 1,
    gap: Spacing.one,
    alignItems: 'flex-start',
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionCard: {
    gap: Spacing.two,
  },
  stateCard: {
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  notice: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
