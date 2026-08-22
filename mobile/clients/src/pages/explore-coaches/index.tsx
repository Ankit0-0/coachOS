import { StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const coachTypes = ['Strength', 'Fat loss', 'Mobility', 'Nutrition'];

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
          Browse coaching styles and specialties before marketplace data is connected.
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {coachTypes.map((type) => (
          <ThemedView key={type} type="backgroundElement" style={[styles.tile, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">{type}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Coming soon
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
    minHeight: 96,
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.one,
  },
});
