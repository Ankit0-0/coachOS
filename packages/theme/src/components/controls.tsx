import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../provider';
import type { ThemeColor } from '../themes';
import { HitTarget, Radii, Spacing, Type } from '../tokens';
import { ThemedText } from './text';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: SymbolName;
};

const BUTTON_TEXT: Record<ButtonVariant, ThemeColor> = {
  primary: 'onPrimary',
  secondary: 'textPrimary',
  danger: 'danger',
  ghost: 'primary',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  icon,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const textColor = BUTTON_TEXT[variant];

  const fill = (pressed: boolean) => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: pressed ? theme.primaryPressed : theme.primary };
      case 'secondary':
        return { backgroundColor: pressed ? theme.surfaceInset : theme.surface, borderWidth: 1, borderColor: theme.border };
      case 'danger':
        return { backgroundColor: theme.dangerSoft };
      case 'ghost':
        return pressed ? { backgroundColor: theme.chipBg } : undefined;
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      aria-disabled={!!isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      hitSlop={size === 'sm' ? (HitTarget - 36) / 2 : undefined}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        fill(pressed && !isDisabled),
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={theme[textColor]} />
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={16} tintColor={theme[textColor]} /> : null}
          <ThemedText themeColor={textColor} style={size === 'sm' ? Type.smallBold : Type.button}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: SymbolName;
  /** Read out in place of the icon, so say what it does: "Call Marcus Bell". */
  label: string;
  onPress: () => void;
};

/** A round, outlined icon-only button. */
export function IconButton({ icon, label, onPress }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceInset : theme.surface },
      ]}>
      <SymbolView name={icon} size={18} tintColor={theme.primary} />
    </Pressable>
  );
}

export const CALL_ICON: SymbolName = { ios: 'phone', android: 'call', web: 'call' };
export const MESSAGE_ICON: SymbolName = { ios: 'message', android: 'chat', web: 'chat' };
export const CLOSE_ICON: SymbolName = { ios: 'xmark', android: 'close', web: 'close' };
export const EDIT_ICON: SymbolName = { ios: 'pencil', android: 'edit', web: 'edit' };

const CHECK: SymbolName = { ios: 'checkmark', android: 'check', web: 'check' };

type CheckboxProps = {
  checked: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * 24pt circle (landing CheckInVisual): primary fill and check when done,
 * outlined when not. Padded out to a 44pt target.
 */
export function Checkbox({ checked, onPress, accessibilityLabel, disabled }: CheckboxProps) {
  const theme = useTheme();
  const box = (
    <View
      style={[
        styles.check,
        checked
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { borderColor: theme.borderStrong },
      ]}>
      {checked ? <SymbolView name={CHECK} size={14} weight="bold" tintColor={theme.onPrimary} /> : null}
    </View>
  );
  if (!onPress) return box;
  return (
    <Pressable
      accessibilityRole="checkbox"
      aria-checked={checked}
      aria-disabled={!!disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={(HitTarget - 24) / 2}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled]}>
      {box}
    </Pressable>
  );
}

type SegmentedOption<T extends string> = { value: T; label: string; accessibilityLabel?: string };

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Selected segment takes the primary fill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  disabled,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segments, { backgroundColor: theme.surfaceInset, borderColor: theme.border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel}
            aria-checked={selected}
            aria-disabled={!!disabled}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: theme.primary },
              pressed && !selected && { backgroundColor: theme.chipBg },
            ]}>
            <ThemedText type="smallBold" themeColor={selected ? 'onPrimary' : 'textSecondary'} numberOfLines={1}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  /** The bordered frame. */
  style?: StyleProp<ViewStyle>;
  /** Text-level tweaks on the input itself: alignment, letter spacing. */
  inputStyle?: StyleProp<TextStyle>;
  invalid?: boolean;
  /** Trailing element inside the field, e.g. a unit or a toggle. */
  trailing?: ReactNode;
};

/** Bordered single-line input; the border darkens on focus. */
export function TextField({
  style,
  inputStyle,
  invalid,
  trailing,
  onFocus,
  onBlur,
  multiline,
  editable,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = invalid ? theme.danger : focused ? theme.primary : theme.borderInput;
  // Read-only fields sit on the inset tint, so they don't look typeable.
  const readOnly = editable === false;
  return (
    <View
      style={[
        styles.field,
        multiline && styles.fieldMultiline,
        { backgroundColor: readOnly ? theme.surfaceInset : theme.surface, borderColor },
        style,
      ]}>
      <TextInput
        placeholderTextColor={theme.textMuted}
        selectionColor={theme.primary}
        cursorColor={theme.primary}
        multiline={multiline}
        editable={editable}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, multiline && styles.inputMultiline, { color: theme.textPrimary }, inputStyle]}
      />
      {trailing}
    </View>
  );
}

const SHOW_ICON: SymbolName = { ios: 'eye', android: 'visibility', web: 'visibility' };
const HIDE_ICON: SymbolName = { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' };

/** Password field with a show/hide toggle; each field keeps its own state. */
export function PasswordInput({ editable = true, ...rest }: Omit<TextFieldProps, 'secureTextEntry' | 'trailing'>) {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...rest}
      editable={editable}
      secureTextEntry={!isVisible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          onPress={() => setIsVisible((current) => !current)}
          disabled={!editable}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
          <SymbolView name={isVisible ? HIDE_ICON : SHOW_ICON} size={20} tintColor={theme.textSecondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    minHeight: 48,
    paddingHorizontal: Spacing.threeHalf,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radii.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
  iconButton: {
    width: HitTarget,
    height: HitTarget,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segments: {
    flexDirection: 'row',
    padding: Spacing.one,
    gap: Spacing.one,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  // Sized to the label, then sharing what's left, so a longer label isn't truncated.
  segment: {
    flexGrow: 1,
    flexBasis: 'auto',
    minHeight: HitTarget,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  fieldMultiline: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    // Lets a narrow field shrink the input instead of it overflowing (web).
    minWidth: 0,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    ...Type.body,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  toggle: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    minWidth: HitTarget,
  },
});
