import { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

type KeyboardFormProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * How far this view's top sits below the top of the screen: the height of a
   * navigation header above it. The auth and tab screens hide the native
   * header, so for them it is 0.
   */
  keyboardVerticalOffset?: number;
}>;

/** Shared with ScreenScaffold's `avoidKeyboard`, for the reason given on KeyboardForm. */
export const KEYBOARD_AVOIDING_BEHAVIOR = Platform.OS === 'web' ? undefined : 'padding';

/**
 * Keeps a form usable with the keyboard open: the focused field and the submit
 * button both stay reachable, and a tap on a button lands the first time.
 *
 * Android: Expo writes `adjustResize` into the manifest, but this app targets
 * SDK 36, where React Native runs edge-to-edge — and edge-to-edge windows are
 * never resized for the keyboard. So `adjustResize` does nothing here and
 * Android needs `padding` just like iOS. `padding` is computed from how much
 * of this view the keyboard actually covers, so it can't double up with a
 * window that did resize.
 */
export function KeyboardForm({ children, contentContainerStyle, keyboardVerticalOffset = 0 }: KeyboardFormProps) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
