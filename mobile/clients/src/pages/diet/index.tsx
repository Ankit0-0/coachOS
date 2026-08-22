import { StyleSheet, View } from 'react-native';

import { DetailHeader } from '@/components/detail-header';
import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dietDetails } from '@/utils/dashboard-data';

export function DietDetailsScreen() {
  const theme = useTheme();

  return (
    <ScreenScaffold>
      <DetailHeader title="Diet" subtitle={dietDetails.title} />

      <ThemedView type="backgroundElement" style={[styles.summary, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color: theme.warning }}>
          {dietDetails.calories}
        </ThemedText>
        <ThemedText>{dietDetails.focus}</ThemedText>
      </ThemedView>

      <View style={styles.list}>
        {dietDetails.meals.map((meal) => (
          <ThemedView key={meal} type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
            <View style={[styles.dot, { backgroundColor: theme.warning }]} />
            <ThemedText style={styles.rowText}>{meal}</ThemedText>
          </ThemedView>
        ))}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowText: {
    flex: 1,
  },
});
