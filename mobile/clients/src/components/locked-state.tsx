import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LockedStateProps = {
  title: string;
};

/** Shown in place of a screen's real content when the client has no accepted coach yet. */
export function LockedState({ title }: LockedStateProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScreenScaffold includeBottomTabInset>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={[styles.panel, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">You need a coach to unlock this</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
          Once you accept a coach's invite, this tab unlocks automatically.
        </ThemedText>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/explore-coaches')}>
          <ThemedText type="smallBold" style={styles.buttonLabel}>
            Explore coaches
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  panel: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  copy: {
    textAlign: 'center',
  },
  button: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  buttonLabel: {
    color: '#FFFFFF',
  },
});
