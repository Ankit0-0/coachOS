import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  /**
   * `raised` — a card sitting on the page background.
   * `inset` — a row nested inside a raised card.
   * Distinct fills and radii keep these from collapsing into one look.
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
        { backgroundColor: variant === 'raised' ? theme.surface : theme.surfaceSunken },
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
  },
  inset: {
    borderRadius: Radii.sm,
  },
  raisedPadding: {
    padding: Spacing.three,
  },
  insetPadding: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
