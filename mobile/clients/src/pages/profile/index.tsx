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
import { clientProfileApi, trackingApi, type ClientProfile } from '@/lib/api';

type Draft = {
  name: string;
  heightCm: string;
  weightKg: string;
  goals: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatMemberSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function draftFrom(profile: ClientProfile): Draft {
  return {
    name: profile.name,
    heightCm: profile.heightCm === null ? '' : String(profile.heightCm),
    weightKg: profile.weightKg === null ? '' : String(profile.weightKg),
    goals: profile.goals ?? '',
  };
}

/** Parses an optional measurement. `undefined` means the text was not a usable number. */
function parseOptionalNumber(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [planCount, setPlanCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Shown inline rather than via Alert, which is a no-op on React Native Web.
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);

  const load = useCallback(() => {
    Promise.all([clientProfileApi.get(), trackingApi.listAssignments().catch(() => [])])
      .then(([nextProfile, assignments]) => {
        setProfile(nextProfile);
        setPlanCount(assignments.length);
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
      setFormError('Your name is how your coach recognises you — it cannot be empty.');
      return;
    }

    const heightCm = parseOptionalNumber(draft.heightCm);
    if (heightCm === undefined) {
      setFormError('Enter your height in centimetres, or leave it blank.');
      return;
    }

    const weightKg = parseOptionalNumber(draft.weightKg);
    if (weightKg === undefined) {
      setFormError('Enter your weight in kilograms, or leave it blank.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      const updated = await clientProfileApi.update({
        name: draft.name.trim(),
        heightCm,
        weightKg,
        goals: draft.goals.trim(),
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
            <Pill label="Client" tone="accent" />
            <ThemedText type="meta">Member since {formatMemberSince(profile.memberSince)}</ThemedText>
          </View>
        </View>
      </View>

      <Card style={styles.statStrip}>
        <View style={styles.stat}>
          <ThemedText type="numeric">{profile.heightCm ?? '—'}</ThemedText>
          <ThemedText type="meta">Height (cm)</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="numeric">{profile.weightKg ?? '—'}</ThemedText>
          <ThemedText type="meta">Weight (kg)</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="numeric">{planCount}</ThemedText>
          <ThemedText type="meta">Active plans</ThemedText>
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
                Height (cm)
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.heightCm}
                onChangeText={(value) => setDraft({ ...draft, heightCm: value })}
                placeholder="e.g. 178"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                editable={!isSaving}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Weight (kg)
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                value={draft.weightKg}
                onChangeText={(value) => setDraft({ ...draft, weightKg: value })}
                placeholder="e.g. 74.5"
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                editable={!isSaving}
              />
              <ThemedText type="meta">
                Your starting figure. Day-to-day weigh-ins live under Progress.
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Goals
              </ThemedText>
              <TextInput
                style={[styles.input, styles.multiline, { borderColor: theme.border, color: theme.text }]}
                value={draft.goals}
                onChangeText={(value) => setDraft({ ...draft, goals: value })}
                placeholder="What you want to get out of your training"
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
            <FieldRow label="Height" value={profile.heightCm === null ? null : `${profile.heightCm} cm`} />
            <FieldRow label="Weight" value={profile.weightKg === null ? null : `${profile.weightKg} kg`} />
            <FieldRow label="Goals" value={profile.goals} stacked divider={false} />
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
                You&apos;ll need to sign in again to reach your plans.
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
