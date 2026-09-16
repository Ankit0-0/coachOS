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
};

/**
 * One tap target per day of the cycle. The dot under each says whether that day
 * has anything in it, so an unfinished cycle is visible without opening every
 * day — which is what stops a coach saving a plan with three blank days in it.
 */
export function DayStrip({ days, selectedIndex, onSelect }: DayStripProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {days.map((day, index) => {
        const isSelected = index === selectedIndex;
        const state = day.isRestDay ? 'rest day' : day.isFilled ? 'has content' : 'empty';
        return (
          <Pressable
            key={day.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Day ${index + 1}${day.label ? `, ${day.label}` : ''}, ${state}`}
            onPress={() => onSelect(index)}
            style={[
              styles.day,
              { borderColor: theme.border },
              isSelected && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
            ]}>
            <ThemedText type="smallBold" themeColor={isSelected ? 'accent' : 'text'}>
              {index + 1}
            </ThemedText>
            <View
              style={[
                styles.marker,
                day.isRestDay
                  ? { backgroundColor: theme.textMuted, width: 10, height: 2 }
                  : day.isFilled
                    ? { backgroundColor: theme.textSecondary }
                    : { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
              ]}
            />
          </Pressable>
        );
      })}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
  },
});
