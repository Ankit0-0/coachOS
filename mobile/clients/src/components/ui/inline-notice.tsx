import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Long enough to read a short sentence, short enough not to linger over the page. */
const AUTO_DISMISS_MS = 4000;

type InlineNoticeProps = {
  /** Nothing renders while this is null. */
  message: string | null;
  onDismiss: () => void;
};

/**
 * A small, self-dismissing note for a minor, recoverable problem — a link that
 * didn't open, say. Sits right under whatever it's about, at meta size on the
 * sunken fill: the warning icon says something went wrong, without a block of
 * red text taking over the screen. Dismisses itself, or with the ×.
 */
export function InlineNotice({ message, onDismiss }: InlineNoticeProps) {
  const theme = useTheme();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: theme.surfaceSunken, borderColor: theme.border }]}>
      <SymbolView
        name={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
        size={14}
        tintColor={theme.warning}
      />
      <ThemedText type="meta" themeColor="textSecondary" style={styles.text}>
        {message}
      </ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={8}>
        <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={12} tintColor={theme.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  text: {
    flexShrink: 1,
  },
});
