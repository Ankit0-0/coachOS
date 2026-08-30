import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clientGoals, clientProfile } from '@/utils/dashboard-data';

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
          Your goals, progress, preferences, and account settings live here using the local demo data store.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.profileCard, { borderColor: theme.border }]}>
        <Image source={{ uri: clientProfile.avatar }} style={styles.avatar} />
        <View style={styles.profileCopy}>
          <ThemedText type="smallBold">{clientProfile.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {clientProfile.goal} • {clientProfile.level}
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
});
