import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEIGHT_RANGES, type WeightRangeKey } from '@/lib/weight-range';

type WeightRangeSelectorProps = {
  value: WeightRangeKey;
  onChange: (range: WeightRangeKey) => void;
};

/** 1 week / 1 month / 3 months / 1 year, above the weight chart. */
export function WeightRangeSelector({ value, onChange }: WeightRangeSelectorProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {WEIGHT_RANGES.map((range) => {
        const selected = range.key === value;
        return (
          <Pressable
            key={range.key}
            accessibilityRole="tab"
            aria-selected={selected}
            onPress={() => onChange(range.key)}
            style={({ pressed }) => [
              styles.option,
              { borderColor: selected ? theme.accent : theme.border },
              selected && { backgroundColor: theme.accent },
              pressed && !selected && styles.pressed,
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'onAccent' : 'textSecondary'} numberOfLines={1}>
              {range.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
