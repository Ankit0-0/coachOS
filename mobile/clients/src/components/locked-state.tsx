import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { IconTile } from '@coachos/theme';

type LockedStateProps = {
  title: string;
  /** Pull-to-refresh, so a client who has just accepted an invite can unlock without leaving. */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Shown in place of a screen's real content when the client has no accepted coach yet. */
export function LockedState({ title, refreshing, onRefresh }: LockedStateProps) {
  const router = useRouter();

  return (
    <ScreenScaffold includeBottomTabInset refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <ThemedText type="display">{title}</ThemedText>
      </View>

      <Card style={styles.panel}>
        <IconTile icon={{ ios: 'lock', android: 'lock', web: 'lock' }} />
        <ThemedText type="heading">You need a coach to unlock this</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
          Once you accept a coach&apos;s invite, this tab unlocks automatically.
        </ThemedText>
        <Button label="Explore coaches" fullWidth onPress={() => router.push('/explore-coaches')} />
        {/* Invites live on the coach screen, which is no longer a tab — this is the way in before there's a coach. */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/my-coach')} hitSlop={12}>
          <ThemedText type="linkPrimary">Invites and requests</ThemedText>
        </Pressable>
      </Card>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  panel: {
    gap: Spacing.twoHalf,
    alignItems: 'center',
  },
  copy: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
});
