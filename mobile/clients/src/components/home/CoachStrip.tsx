import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { CALL_ICON, IconButton, MESSAGE_ICON } from '@/components/ui/icon-button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { InvitePerson } from '@/lib/api';
import { buildTelUrl, startCall } from '@/lib/call';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';

type CoachStripProps = {
  coach: InvitePerson;
};

/**
 * Who the client is working with, one tap from calling or messaging them. Slim
 * on purpose: it sits above the day's plan, which is what the client opened
 * the app for. Tapping anywhere but the two buttons opens the full coach screen.
 */
export function CoachStrip({ coach }: CoachStripProps) {
  const theme = useTheme();
  const router = useRouter();
  /** A small notice under the strip, since Alert is a no-op on React Native Web. */
  const [error, setError] = useState<string | null>(null);
  const dismissError = useCallback(() => setError(null), []);

  // Both hide together: they share the one number, and there's none to use.
  const hasNumber = buildTelUrl(coach.phone) !== null && buildWhatsAppUrl(coach.phone) !== null;

  const call = async () => {
    setError(null);
    const result = await startCall(coach.phone);
    if (result.status === 'error') setError(result.message);
  };

  // Nothing prefilled: this opens a conversation, it doesn't send a message.
  const chat = async () => {
    setError(null);
    const result = await openWhatsApp(coach.phone);
    if (result.status === 'error') setError(result.message);
  };

  // The whole strip is tappable, but the call and chat buttons can't sit inside
  // that press target — nested buttons are invalid on web and ambiguous to a
  // screen reader. So the target is a layer behind the row, and the row lets
  // taps through everywhere except the two buttons.
  return (
    <View style={styles.wrap}>
      <View style={[styles.strip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your coach, ${coach.name}. Open coach details`}
          onPress={() => router.push('/my-coach')}
          style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { backgroundColor: theme.surfaceInset }]}
        />
        <View style={styles.row}>
          <View style={[styles.identity, styles.passThrough]} aria-hidden>
            <Avatar name={coach.name} size="row" imageUrl={coach.avatarUrl ?? null} />
            <View style={styles.name}>
              <ThemedText type="meta">Your coach</ThemedText>
              <ThemedText type="smallBold" numberOfLines={1}>
                {coach.name}
              </ThemedText>
            </View>
          </View>
          {hasNumber ? (
            <View style={styles.actions}>
              <IconButton icon={CALL_ICON} label={`Call ${coach.name}`} onPress={() => void call()} />
              <IconButton
                icon={MESSAGE_ICON}
                label={`Message ${coach.name} on WhatsApp`}
                onPress={() => void chat()}
              />
            </View>
          ) : null}
          <View style={styles.passThrough} aria-hidden>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={18}
              tintColor={theme.textMuted}
            />
          </View>
        </View>
      </View>
      <InlineNotice message={error} onDismiss={dismissError} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  strip: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    // Taps land on the press layer behind, except where a child claims them.
    pointerEvents: 'box-none',
  },
  passThrough: {
    pointerEvents: 'none',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
