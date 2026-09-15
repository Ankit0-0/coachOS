import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DetailHeaderProps = {
  title: string;
  subtitle: string;
  /** Sits at the top right, beside the title — e.g. call and message buttons. */
  actions?: ReactNode;
};

export function DetailHeader({ title, subtitle, actions }: DetailHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.backButton, { borderColor: theme.border }, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={20}
          tintColor={theme.text}
        />
      </Pressable>
      <View style={styles.copy}>
        <ThemedText type="subtitle" style={styles.title} numberOfLines={actions ? 2 : undefined}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" numberOfLines={actions ? 1 : undefined}>
          {subtitle}
        </ThemedText>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  copy: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.half,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
});
