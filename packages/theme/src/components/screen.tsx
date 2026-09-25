import { type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../provider';
import { BottomTabInset, MaxContentWidth, ScreenPadding, Spacing } from '../tokens';

/**
 * Android targets SDK 36 and runs edge-to-edge, where `adjustResize` never
 * resizes the window for the keyboard, so it needs `padding` just like iOS.
 */
export const KEYBOARD_AVOIDING_BEHAVIOR = Platform.OS === 'web' ? undefined : 'padding';

type KeyboardFormProps = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Height of a navigation header above this view; 0 when the header is hidden. */
  keyboardVerticalOffset?: number;
}>;

/** Keeps a form usable with the keyboard open. */
export function KeyboardForm({ children, contentContainerStyle, keyboardVerticalOffset = 0 }: KeyboardFormProps) {
  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={KEYBOARD_AVOIDING_BEHAVIOR}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.formContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ScreenProps = PropsWithChildren<{
  includeBottomTabInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pull-to-refresh. Pass both; keep `refreshing` separate from initial loading. */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** For screens with inputs: keeps the focused field above the keyboard. */
  avoidKeyboard?: boolean;
  /** Stays put above the scrolling content. */
  pinnedHeader?: ReactNode;
}>;

/** Page background, safe area, gutter and scroll for every screen. */
export function Screen({
  children,
  contentStyle,
  includeBottomTabInset = false,
  refreshing = false,
  onRefresh,
  avoidKeyboard = false,
  pinnedHeader,
}: ScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {pinnedHeader ? <View style={styles.pinnedHeader}>{pinnedHeader}</View> : null}
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={avoidKeyboard ? KEYBOARD_AVOIDING_BEHAVIOR : undefined}
          enabled={avoidKeyboard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.textMuted}
                  colors={[theme.primary]}
                  progressBackgroundColor={theme.surface}
                />
              ) : undefined
            }
            contentContainerStyle={[styles.content, includeBottomTabInset && styles.contentWithTabs, contentStyle]}>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
  formContent: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.threeHalf,
  },
  contentWithTabs: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  pinnedHeader: {
    paddingHorizontal: ScreenPadding,
    paddingTop: Spacing.two,
  },
});
