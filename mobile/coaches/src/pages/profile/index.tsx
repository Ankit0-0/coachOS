import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldRow } from '@/components/ui/field-row';
import { Pill } from '@/components/ui/pill';
import { Section } from '@/components/ui/section';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, coachProfileApi, planApi, type CoachProfile } from '@/lib/api';

type Stats = { clients: number; workoutPlans: number; dietPlans: number };

type Draft = {
  name: string;
  phone: string;
  yearsExperience: string;
  specialties: string;
  bio: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function draftFrom(profile: CoachProfile): Draft {
  return {
    name: profile.name,
    phone: profile.phone ?? '',
    yearsExperience: profile.yearsExperience === null ? '' : String(profile.yearsExperience),
    specialties: profile.specialties.join(', '),
    bio: profile.bio ?? '',
  };
}

export function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [stats, setStats] = useState<Stats>({ clients: 0, workoutPlans: 0, dietPlans: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Shown inline rather than via Alert, which is a no-op on React Native Web.
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      coachProfileApi.get(),
      coachInviteApi.list('ACCEPTED'),
      planApi.list('WORKOUT'),
      planApi.list('DIET'),
    ])
      .then(([nextProfile, clients, workout, diet]) => {
        setProfile(nextProfile);
        setStats({
          clients: clients.length,
          workoutPlans: workout.own.length,
          dietPlans: diet.own.length,
        });
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startEditing = () => {
    if (!profile) return;
    setDraft(draftFrom(profile));
    setFormError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setFormError('Your name is how clients recognise you — it cannot be empty.');
      return;
    }

    const years = draft.yearsExperience.trim();
    const parsedYears = years === '' ? null : Number.parseInt(years, 10);
    if (parsedYears !== null && (Number.isNaN(parsedYears) || parsedYears < 0)) {
      setFormError('Enter a whole number of years of experience, or leave it blank.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      const updated = await coachProfileApi.update({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        bio: draft.bio.trim(),
        yearsExperience: parsedYears,
        specialties: draft.specialties
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      });
      setProfile(updated);
      setIsEditing(false);
      setDraft(null);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmed inline rather than with Alert, which is a no-op on React Native
  // Web — routed through Alert, the sign-out button did nothing in a browser.
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);

  if (isLoading) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ActivityIndicator color={theme.textSecondary} />
      </ScreenScaffold>
    );
  }

  if (!profile) {
    return (
      <ScreenScaffold includeBottomTabInset>
        <ThemedText type="display">Profile</ThemedText>
        <Card>
          <ThemedText type="smallBold">Your profile didn&apos;t load</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.errorCopy}>
            Check your connection and try again.
          </ThemedText>
          <Button label="Retry" variant="secondary" onPress={load} />
        </Card>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.identity}>
        <Avatar name={profile.name} size="lg" />
        <View style={styles.identityText}>
          <ThemedText type="display">{profile.name}</ThemedText>
          <View style={styles.identityMeta}>
            <Pill label="Coach" tone="accent" />
            <ThemedText type="meta">Coaching since {formatMemberSince(profile.memberSince)}</ThemedText>
          </View>
        </View>
      </View>

      <Card style={styles.statStrip}>
        <View style={styles.stat}>
          <ThemedText type="numeric">{stats.clients}</ThemedText>
          <ThemedText type="meta">Clients</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="numeric">{stats.workoutPlans}</ThemedText>
          <ThemedText type="meta">Workout plans</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="numeric">{stats.dietPlans}</ThemedText>
          <ThemedText type="meta">Diet plans</ThemedText>
        </View>
      </Card>

      {isEditing && draft ? (
        <Section title="Edit details">
          <Card style={styles.form}>
            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Name
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.name}
                onChangeText={(value) => setDraft({ ...draft, name: value })}
                placeholder="Your full name"
                placeholderTextColor={theme.textMuted}
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Phone
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.phone}
                onChangeText={(value) => setDraft({ ...draft, phone: value })}
                placeholder="How clients reach you"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Years of experience
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.yearsExperience}
                onChangeText={(value) => setDraft({ ...draft, yearsExperience: value })}
                placeholder="e.g. 7"
                placeholderTextColor={theme.textMuted}
                keyboardType="number-pad"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Specialties
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.specialties}
                onChangeText={(value) => setDraft({ ...draft, specialties: value })}
                placeholder="Strength, Mobility, Nutrition"
                placeholderTextColor={theme.textMuted}
                editable={!isSaving}
              />
              <ThemedText type="meta">Separate each one with a comma.</ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Bio
              </ThemedText>
              <TextInput
                style={[styles.input, styles.multiline, { borderColor: theme.border, color: theme.text }]}
                value={draft.bio}
                onChangeText={(value) => setDraft({ ...draft, bio: value })}
                placeholder="What you focus on, who you work best with"
                placeholderTextColor={theme.textMuted}
                multiline
                editable={!isSaving}
              />
            </View>

            {formError ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
                <ThemedText type="small" themeColor="danger">
                  {formError}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.formActions}>
              <View style={styles.formAction}>
                <Button label="Cancel" variant="secondary" onPress={cancelEditing} disabled={isSaving} fullWidth />
              </View>
              <View style={styles.formAction}>
                <Button label="Save changes" onPress={handleSave} loading={isSaving} fullWidth />
              </View>
            </View>
          </Card>
        </Section>
      ) : (
        <Section title="Details" actionLabel="Edit" onActionPress={startEditing}>
          <Card padded={false} style={styles.detailCard}>
            <FieldRow label="Name" value={profile.name} />
            <FieldRow label="Email" value={profile.email} />
            <FieldRow label="Phone" value={profile.phone} />
            <FieldRow
              label="Experience"
              value={profile.yearsExperience === null ? null : `${profile.yearsExperience} years`}
            />
            <View style={[styles.specialtyRow, { borderBottomColor: theme.border }]}>
              <ThemedText type="label" themeColor="textSecondary">
                Specialties
              </ThemedText>
              {profile.specialties.length === 0 ? (
                <ThemedText type="smallBold" themeColor="textMuted">
                  Not set
                </ThemedText>
              ) : (
                <View style={styles.specialtyPills}>
                  {profile.specialties.map((specialty) => (
                    <Pill key={specialty} label={specialty} tone="neutral" />
                  ))}
                </View>
              )}
            </View>
            <FieldRow label="Bio" value={profile.bio} stacked divider={false} />
          </Card>
        </Section>
      )}

      <Section title="Account">
        <Card>
          <ThemedText type="smallBold">Signed in as {profile.email}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.accountCopy}>
            Your email is your sign-in and can&apos;t be changed here yet.
          </ThemedText>

          {isConfirmingSignOut ? (
            <View style={styles.confirmBlock}>
              <ThemedText type="small" themeColor="textSecondary">
                You&apos;ll need to sign in again to reach your clients.
              </ThemedText>
              <View style={styles.confirmActions}>
                <View style={styles.confirmAction}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setIsConfirmingSignOut(false)}
                    fullWidth
                  />
                </View>
                <View style={styles.confirmAction}>
                  <Button label="Sign out" variant="danger" onPress={() => void signOut()} fullWidth />
                </View>
              </View>
            </View>
          ) : (
            <Button label="Sign out" variant="danger" onPress={() => setIsConfirmingSignOut(true)} fullWidth />
          )}
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
    paddingTop: Spacing.two,
  },
  identityText: {
    flex: 1,
    gap: Spacing.one,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  detailCard: {
    paddingHorizontal: Spacing.three,
  },
  specialtyRow: {
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  specialtyPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
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
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
  formActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  formAction: {
    flex: 1,
  },
  accountCopy: {
    marginBottom: Spacing.two,
  },
  confirmBlock: {
    gap: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmAction: {
    flex: 1,
  },
  errorCopy: {
    marginBottom: Spacing.two,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
});
