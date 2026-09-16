import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const SHOW_ICON: SymbolName = { ios: 'eye', android: 'visibility', web: 'visibility' };
const HIDE_ICON: SymbolName = { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' };

type PasswordInputProps = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  /** The bordered field around the input and its toggle. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A password field with a show/hide toggle inside it on the right. Hidden by
 * default, and each field keeps its own state — two on one screen toggle
 * independently.
 */
export function PasswordInput({ style, editable = true, ...inputProps }: PasswordInputProps) {
  const theme = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={[styles.field, { borderColor: theme.border }, style]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={theme.textMuted}
        {...inputProps}
        editable={editable}
        secureTextEntry={!isVisible}
        style={[styles.input, { color: theme.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
        onPress={() => setIsVisible((current) => !current)}
        disabled={!editable}
        hitSlop={8}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <SymbolView name={isVisible ? HIDE_ICON : SHOW_ICON} size={20} tintColor={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    minHeight: 48,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingLeft: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  toggle: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
