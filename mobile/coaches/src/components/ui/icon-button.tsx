import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: ComponentProps<typeof SymbolView>['name'];
  /** Read out in place of the icon, so say what it does: "Call Marcus Bell". */
  label: string;
  onPress: () => void;
};

/** A round, outlined icon-only button — call and message actions beside a name. */
export function IconButton({ icon, label, onPress }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.button, { borderColor: theme.border }, pressed && styles.pressed]}>
      <SymbolView name={icon} size={18} tintColor={theme.text} />
    </Pressable>
  );
}

export const CALL_ICON: IconButtonProps['icon'] = { ios: 'phone', android: 'call', web: 'call' };
export const MESSAGE_ICON: IconButtonProps['icon'] = { ios: 'message', android: 'chat', web: 'chat' };

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
