import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  /**
   * `raised` — a card sitting on the page background.
   * `inset` — a row nested inside a raised card.
   * Both are flat: a hairline border separates them from the page rather
   * than a shadow or a heavy grey fill, so a screen of cards reads as one
   * surface with divisions instead of a stack of floating tiles.
   */
  variant?: 'raised' | 'inset';
  padded?: boolean;
};

export function Card({ variant = 'raised', padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        variant === 'raised' ? styles.raised : styles.inset,
        {
          backgroundColor: variant === 'raised' ? theme.surface : theme.surfaceSunken,
          borderColor: theme.border,
        },
        padded && (variant === 'raised' ? styles.raisedPadding : styles.insetPadding),
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  raised: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inset: {
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  raisedPadding: {
    padding: Spacing.four,
  },
  insetPadding: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
