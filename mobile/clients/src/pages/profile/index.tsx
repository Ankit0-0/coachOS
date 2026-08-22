import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProfileScreen() {
  const theme = useTheme();

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
          Your goals, progress, preferences, and account settings will live here.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.profileCard, { borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="subtitle" style={{ color: theme.accent }}>
            C
          </ThemedText>
        </View>
        <View style={styles.profileCopy}>
          <ThemedText type="smallBold">Client profile</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Fitness goal and body metrics can be added next.
          </ThemedText>
        </View>
      </ThemedView>
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
  profileCopy: {
    flex: 1,
    gap: Spacing.one,
  },
});
