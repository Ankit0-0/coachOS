import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Pill } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ClientListItemProps = {
  clientId: string;
  name: string;
  email: string;
  /**
   * Null for an open-ended relationship, which is not a lapse and shows
   * nothing. A marker appears only once a period has actually run out.
   */
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  /** Rows sit inside one shared card, so all but the last carry a divider. */
  divider?: boolean;
};

export function ClientListItem({
  clientId,
  name,
  email,
  subscriptionStatus = null,
  divider = false,
}: ClientListItemProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={() => router.push({ pathname: '/clients/[id]', params: { id: clientId, name, email } })}
      style={({ pressed }) => [
        styles.row,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <Avatar name={name} size="sm" />
      <View style={styles.copy}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="meta" numberOfLines={1}>
          {email}
        </ThemedText>
      </View>
      {subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'CANCELLED' ? (
        <Pill label={subscriptionStatus === 'CANCELLED' ? 'Cancelled' : 'Expired'} />
      ) : null}
      <ThemedText type="small" themeColor="textMuted">
        ›
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
