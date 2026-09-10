import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
};

const TEXT_COLOR: Record<ButtonVariant, ThemeColor> = {
  primary: 'onAccent',
  secondary: 'text',
  danger: 'danger',
  ghost: 'accent',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const surface =
    variant === 'primary'
      ? { backgroundColor: theme.accent }
      : variant === 'danger'
        ? { backgroundColor: theme.dangerSoft }
        : variant === 'secondary'
          ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }
          : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        surface,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? theme.onAccent : theme.accent} />
      ) : (
        <ThemedText type="smallBold" themeColor={TEXT_COLOR[variant]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    minHeight: 48,
  },
  sm: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 36,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});
