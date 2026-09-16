import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { KEYBOARD_AVOIDING_BEHAVIOR } from '@/components/ui/keyboard-form';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenScaffoldProps = PropsWithChildren<{
  includeBottomTabInset?: boolean;
  contentStyle?: ViewStyle;
  /**
   * Pull-to-refresh. Pass both to enable it. `refreshing` should be its own
   * state, separate from a screen's initial loading flag, so a refresh keeps
   * the current content on screen instead of blanking it to a spinner.
   */
  refreshing?: boolean;
  onRefresh?: () => void;
  /**
   * For screens with text inputs: shrinks the scroll area above the keyboard
   * so the focused field and the save button stay reachable. See KeyboardForm
   * for why Android needs this despite `adjustResize`.
   */
  avoidKeyboard?: boolean;
}>;

export function ScreenScaffold({
  children,
  contentStyle,
  includeBottomTabInset = false,
  refreshing = false,
  onRefresh,
  avoidKeyboard = false,
}: ScreenScaffoldProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={avoidKeyboard ? KEYBOARD_AVOIDING_BEHAVIOR : undefined}
          enabled={avoidKeyboard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            // A tap on a button with the keyboard up should press the button,
            // not just close the keyboard.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.textSecondary}
                  colors={[theme.accent]}
                  progressBackgroundColor={theme.surface}
                />
              ) : undefined
            }
            contentContainerStyle={[
              styles.content,
              includeBottomTabInset && styles.contentWithTabs,
              contentStyle,
            ]}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  fill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  contentWithTabs: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
