import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PlanListEntry = {
  id: string;
  title: string;
  stats: string;
};

type PlanListCardProps = {
  eyebrow: string;
  items: PlanListEntry[];
  showAllHref: Href;
};

export function PlanListCard({ eyebrow, items, showAllHref }: PlanListCardProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
        {eyebrow}
      </ThemedText>

      <View style={[styles.headerDivider, { backgroundColor: theme.border }]} />

      {items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No plans yet.
        </ThemedText>
      ) : (
        <View>
          {items.map((item, index) => (
            <View key={item.id}>
              <View style={styles.row}>
                <ThemedText type="small" style={styles.name}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.stats}
                </ThemedText>
              </View>
              {index < items.length - 1 ? (
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.showAll} onPress={() => router.push(showAllHref)}>
        <ThemedText type="small" style={{ color: theme.accent }}>
          Show all
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  showAll: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
});
