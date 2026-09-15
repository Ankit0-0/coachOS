import { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
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
}>;

export function ScreenScaffold({
  children,
  contentStyle,
  includeBottomTabInset = false,
  refreshing = false,
  onRefresh,
}: ScreenScaffoldProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
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
