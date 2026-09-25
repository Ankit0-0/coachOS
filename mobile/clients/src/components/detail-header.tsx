import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { HitTarget, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DetailHeaderProps = {
  title: string;
  subtitle: string;
};

export function DetailHeader({ title, subtitle }: DetailHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.backButton,
          { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceInset : theme.surface },
        ]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={20}
          tintColor={theme.textPrimary}
        />
      </Pressable>
      <View style={styles.copy}>
        <ThemedText type="display">{title}</ThemedText>
        <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
      </View>
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
    width: HitTarget,
    height: HitTarget,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
