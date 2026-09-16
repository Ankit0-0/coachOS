import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

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
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { coachInviteApi, coachProfileApi, planApi, type CoachProfile } from '@/lib/api';
import { pickAndUploadImage } from '@/lib/image-upload';
import { formatPhone, INVALID_PHONE_MESSAGE, parsePhone, phoneFieldHint, phoneForEditing } from '@/lib/phone';

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
    phone: phoneForEditing(profile.phone),
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingListing, setIsSavingListing] = useState(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [nextProfile, clients, workout, diet] = await Promise.all([
        coachProfileApi.get(),
        coachInviteApi.list('ACCEPTED'),
        planApi.list('WORKOUT'),
        planApi.list('DIET'),
      ]);
      setProfile(nextProfile);
      setStats({
        clients: clients.length,
        workoutPlans: workout.own.length,
        dietPlans: diet.own.length,
      });
    } catch {
      // As before: the screen shows its "didn't load" card when nothing has loaded.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const { isRefreshing, refresh } = useRefresh(load);

  /** Optimistic: flips at once, and flips back if the save fails. */
  const handleListingChange = async (listed: boolean) => {
    if (!profile || isSavingListing) return;
    const previous = profile;
    setListingError(null);
    setIsSavingListing(true);
    setProfile({ ...profile, listedInExplore: listed });
    try {
      setProfile(await coachProfileApi.update({ listedInExplore: listed }));
    } catch (error) {
      setProfile(previous);
      setListingError(errorMessage(error));
    } finally {
      setIsSavingListing(false);
    }
  };

  const handleAvatarPress = async () => {
    if (isUploadingAvatar) return;

    setAvatarError(null);
    setIsUploadingAvatar(true);
    try {
      const result = await pickAndUploadImage('avatar');

      // Cancelling leaves the current avatar exactly as it was.
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        setAvatarError(result.message);
        return;
      }

      // The response carries a freshly signed avatarUrl, so the new photo
      // appears without a reload.
      setProfile(await coachProfileApi.update({ avatarKey: result.key }));
    } catch (error) {
      setAvatarError(errorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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

    // Optional: blank clears it. Anything else has to be a number WhatsApp can reach.
    const phone = parsePhone(draft.phone);
    if (phone.status === 'invalid') {
      setFormError(INVALID_PHONE_MESSAGE);
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      const updated = await coachProfileApi.update({
        name: draft.name.trim(),
        phone: phone.status === 'valid' ? phone.digits : '',
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
      <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh}>
        <ThemedText type="display">Profile</ThemedText>
        <Card>
          <ThemedText type="smallBold">Your profile didn&apos;t load</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.errorCopy}>
            Check your connection and try again.
          </ThemedText>
          <Button label="Retry" variant="secondary" onPress={() => void load()} />
        </Card>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold includeBottomTabInset refreshing={isRefreshing} onRefresh={refresh} avoidKeyboard>
      <View style={styles.identity}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profile.avatarUrl ? 'Change your photo' : 'Add a photo'}
          onPress={() => void handleAvatarPress()}
          disabled={isUploadingAvatar}
          style={styles.avatarButton}>
          <Avatar name={profile.name} size="lg" imageUrl={profile.avatarUrl} />
          {isUploadingAvatar ? (
            <View style={[styles.avatarOverlay, { backgroundColor: theme.surfaceSunken }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.identityText}>
          <ThemedText type="display">{profile.name}</ThemedText>
          <View style={styles.identityMeta}>
            <Pill label="Coach" />
            <ThemedText type="meta">Coaching since {formatMemberSince(profile.memberSince)}</ThemedText>
          </View>
          <ThemedText type="meta">
            {isUploadingAvatar ? 'Uploading photo…' : 'Tap your photo to change it'}
          </ThemedText>
        </View>
      </View>

      {avatarError ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger">
            {avatarError}
          </ThemedText>
        </View>
      ) : null}

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
                placeholder="98765 43210"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={!isSaving}
              />
              <ThemedText type="meta">{phoneFieldHint(draft.phone)}</ThemedText>
              <ThemedText type="meta">Only clients you coach can see it, to message you on WhatsApp.</ThemedText>
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
            <FieldRow label="Phone" value={formatPhone(profile.phone)} />
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

      <Section title="Explore">
        <Card style={styles.listingCard}>
          <View style={styles.listingRow}>
            <View style={styles.listingCopy}>
              <ThemedText type="smallBold">Show me in Explore</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Clients can find your profile and ask you to coach them. They see your name, photo,
                bio, specialties and experience — never your email or phone.
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel="Show me in Explore"
              value={profile.listedInExplore}
              onValueChange={(listed) => void handleListingChange(listed)}
              disabled={isSavingListing}
              trackColor={{ false: theme.border, true: theme.accent }}
              // Not `surface`: in dark mode that is the card colour itself, so the
              // thumb vanished. Muted when off, and onAccent on the accent track.
              thumbColor={profile.listedInExplore ? theme.onAccent : theme.textMuted}
              // React Native Web ignores thumbColor while on and falls back to its own
              // teal (#009688); activeThumbColor is its web-only override.
              {...({ activeThumbColor: theme.onAccent } as object)}
            />
          </View>
          {profile.listedInExplore && profile.approvalStatus !== 'APPROVED' ? (
            <ThemedText type="meta">You&apos;ll appear once an admin approves your account.</ThemedText>
          ) : null}
          {listingError ? (
            <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
              <ThemedText type="small" themeColor="danger">
                {listingError}
              </ThemedText>
            </View>
          ) : null}
        </Card>
      </Section>

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
  avatarButton: {
    position: 'relative',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radii.pill,
    opacity: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
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
  listingCard: {
    gap: Spacing.two,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  listingCopy: {
    flex: 1,
    gap: Spacing.half,
  },
});
