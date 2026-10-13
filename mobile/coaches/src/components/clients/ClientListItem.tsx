import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Row } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import type { AttentionReason } from '@/lib/api';
import { formatDateKey } from '@/lib/dates';
import { attentionChip, lastCheckInLabel } from '@/lib/roster';

type ClientListItemProps = {
  clientId: string;
  name: string;
  email: string;
  /** A signed URL for the client's photo; initials show when it's null or missing. */
  avatarUrl?: string | null;
  /**
   * Null for an open-ended relationship, which is not a lapse and shows
   * nothing. A marker appears only once a period has actually run out.
   */
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  /** The last day they ticked anything off; null if never. */
  lastCheckInDate?: string | null;
  /** Why they may need the coach, most pressing first; the row shows the first. */
  attention?: readonly AttentionReason[];
};

/** One client as a row in the roster's inset panel: avatar, name, last check-in, and what needs attention. */
export function ClientListItem({
  clientId,
  name,
  email,
  avatarUrl = null,
  subscriptionStatus = null,
  lastCheckInDate = null,
  attention = [],
}: ClientListItemProps) {
  const router = useRouter();
  // Expired is one of the attention reasons; a cancelled subscription isn't, but is still worth a marker.
  const chip =
    attentionChip(attention) ??
    (subscriptionStatus === 'CANCELLED' ? { label: 'Cancelled', tone: 'warning' as const } : null);

  return (
    <Row
      accessibilityLabel={`Open ${name}`}
      onPress={() => router.push({ pathname: '/clients/[id]', params: { id: clientId, name, email } })}>
      <Avatar name={name} size="row" imageUrl={avatarUrl} tone="warm" />
      <View style={styles.copy}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText type="meta" numberOfLines={1}>
          {lastCheckInLabel(lastCheckInDate, formatDateKey(new Date()))}
        </ThemedText>
      </View>
      {chip ? <Chip label={chip.label} tone={chip.tone} /> : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
