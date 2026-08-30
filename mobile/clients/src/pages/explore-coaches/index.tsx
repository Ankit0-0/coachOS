import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { availableCoaches } from '@/utils/dashboard-data';

export function ExploreCoachesScreen() {
  const theme = useTheme();

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent">
          Explore Coaches
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Find the right fit
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Browse coach profiles and specialties using the local mock dataset while the backend is still being built.
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {availableCoaches.map((coach) => (
          <ThemedView key={coach.id} type="backgroundElement" style={[styles.tile, { borderColor: theme.border }]}>
            <Image source={{ uri: coach.image }} style={styles.avatar} />
            <ThemedText type="smallBold">{coach.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {coach.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {coach.specialties.join(' • ')}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: coach.accent }}>
              {coach.rating.toFixed(1)} ★ ({coach.reviews})
            </ThemedText>
          </ThemedView>
        ))}
      </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    minHeight: 196,
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.one,
  },
  avatar: {
    width: '100%',
    height: 110,
    borderRadius: Spacing.two,
    marginBottom: Spacing.half,
  },
});
