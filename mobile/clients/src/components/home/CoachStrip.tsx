import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ComponentProps, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { InvitePerson } from '@/lib/api';
import { buildTelUrl, startCall } from '@/lib/call';
import { buildWhatsAppUrl, openWhatsApp } from '@/lib/whatsapp';

type CoachStripProps = {
  coach: InvitePerson;
};

type IconButtonProps = {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
};

function IconButton({ icon, label, onPress }: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { borderColor: theme.border }, pressed && styles.pressed]}>
      <SymbolView name={icon} size={18} tintColor={theme.text} />
    </Pressable>
  );
}

/**
 * Who the client is working with, one tap from calling or messaging them. Slim
 * on purpose: it sits above the day's plan, which is what the client opened
 * the app for. Tapping anywhere but the two buttons opens the full coach screen.
 */
export function CoachStrip({ coach }: CoachStripProps) {
  const theme = useTheme();
  const router = useRouter();
  /** Inline, since Alert is a no-op on React Native Web. */
  const [error, setError] = useState<string | null>(null);

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
          style={({ pressed }) => [StyleSheet.absoluteFill, pressed && { backgroundColor: theme.backgroundSelected }]}
        />
        <View style={styles.row}>
          <View style={[styles.identity, styles.passThrough]} aria-hidden>
            <Avatar name={coach.name} size="sm" imageUrl={coach.avatarUrl ?? null} />
            <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
              {coach.name}
            </ThemedText>
          </View>
          {hasNumber ? (
            <View style={styles.actions}>
              <IconButton
                icon={{ ios: 'phone', android: 'call', web: 'call' }}
                label={`Call ${coach.name}`}
                onPress={() => void call()}
              />
              <IconButton
                icon={{ ios: 'message', android: 'chat', web: 'chat' }}
                label={`Message ${coach.name} on WhatsApp`}
                onPress={() => void chat()}
              />
            </View>
          ) : null}
          <View style={styles.passThrough} aria-hidden>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={20}
              tintColor={theme.accent}
            />
          </View>
        </View>
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  strip: {
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
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
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
