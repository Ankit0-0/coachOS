import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DayStripItem = {
  key: string;
  /** The coach's label for the day, e.g. "Pull". Blank until they write one. */
  label: string;
  isRestDay: boolean;
  /** Whether the day has anything in it yet — a rest day counts as filled. */
  isFilled: boolean;
};

type DayStripProps = {
  days: DayStripItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** A column of labelled rows, for the editor's sidebar on a desktop browser. */
  vertical?: boolean;
};

/** What a sidebar row says when the coach hasn't labelled the day. */
function rowLabel(day: DayStripItem): string {
  if (day.label) return day.label;
  if (day.isRestDay) return 'Rest';
  return day.isFilled ? 'No label' : 'Empty';
}

/**
 * One tap target per day of the cycle. The dot under each says whether that day
 * has anything in it, so an unfinished cycle is visible without opening every
 * day — which is what stops a coach saving a plan with three blank days in it.
 */
export function DayStrip({ days, selectedIndex, onSelect, vertical = false }: DayStripProps) {
  const theme = useTheme();

  const items = days.map((day, index) => {
    const isSelected = index === selectedIndex;
    const state = day.isRestDay ? 'rest day' : day.isFilled ? 'has content' : 'empty';
    return (
      <Pressable
        key={day.key}
        accessibilityRole="tab"
        aria-selected={isSelected}
        accessibilityLabel={`Day ${index + 1}${day.label ? `, ${day.label}` : ''}, ${state}`}
        onPress={() => onSelect(index)}
        style={[
          vertical ? styles.row : styles.day,
          { borderColor: theme.border },
          isSelected && { backgroundColor: theme.chipBg, borderColor: theme.primary },
        ]}>
        <ThemedText
          type="smallBold"
          themeColor={isSelected ? 'primary' : 'textPrimary'}
          style={vertical && styles.rowNumber}>
          {index + 1}
        </ThemedText>
        {vertical ? (
          <ThemedText
            type="small"
            themeColor={day.label ? 'textPrimary' : 'textMuted'}
            numberOfLines={1}
            style={styles.rowLabel}>
            {rowLabel(day)}
          </ThemedText>
        ) : null}
        <View
          style={[
            styles.marker,
            day.isRestDay
              ? { backgroundColor: theme.textMuted, width: 10, height: 2 }
              : day.isFilled
                ? { backgroundColor: theme.textSecondary }
                : { borderWidth: 1, borderColor: theme.border },
          ]}
        />
      </Pressable>
    );
  });

  if (vertical) return <View style={styles.column}>{items}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  day: {
    minWidth: 44,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  column: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.twoHalf,
  },
  rowNumber: {
    minWidth: 20,
  },
  rowLabel: {
    flex: 1,
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
  },
});
