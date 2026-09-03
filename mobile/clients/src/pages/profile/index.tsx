import { StyleSheet, View, Pressable } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';
import { clientGoals } from '@/utils/dashboard-data';

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const displayName = user?.name ?? 'Guest';
  const roleLabel = user?.role === 'COACH' ? 'Coach' : 'Client';

  const handleSignOut = async () => {
    await signOut();
    // Auth provider will automatically redirect to auth screen based on isSignedIn state
  };

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Me
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Profile
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your account details, goals, progress, and preferences live here.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.profileCard, { borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" themeColor="accent" style={styles.avatarInitials}>
            {initialsFor(displayName) || 'C'}
          </ThemedText>
        </View>
        <View style={styles.profileCopy}>
          <ThemedText type="smallBold">{displayName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {user?.email}
          </ThemedText>
          <ThemedText type="small" themeColor="accent">
            {roleLabel}
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.metricsCard, { borderColor: theme.border }]}>
        {clientGoals.map((metric) => (
          <View key={metric.label} style={styles.metricRow}>
            <ThemedText type="small" themeColor="textSecondary">{metric.label}</ThemedText>
            <ThemedText type="smallBold">{metric.value}</ThemedText>
          </View>
        ))}
      </ThemedView>

      <Pressable
        style={[styles.signOutButton, { backgroundColor: theme.warning }]}
        onPress={handleSignOut}
      >
        <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
          Sign Out
        </ThemedText>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  profileCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    lineHeight: 30,
  },
  profileCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  metricsCard: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
