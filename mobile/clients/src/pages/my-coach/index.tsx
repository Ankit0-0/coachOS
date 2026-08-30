import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { myCoach } from '@/utils/dashboard-data';

export function MyCoachScreen() {
  const theme = useTheme();

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          My Coach
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Your coaching hub
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your coach assignment and weekly plan details are powered by the mock data layer until the backend is live.
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
        <Image source={{ uri: myCoach.image }} style={styles.image} />
        <ThemedText type="smallBold">{myCoach.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {myCoach.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {myCoach.specialties.join(' • ')}
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: myCoach.accent }}>
          {myCoach.rating.toFixed(1)} ★ • {myCoach.availability}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {myCoach.bio}
        </ThemedText>
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
  panel: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: Spacing.two,
  },
});
