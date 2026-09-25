import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Row } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';

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
};

/** One client as a row in the roster's inset panel: avatar, name, chevron. */
export function ClientListItem({ clientId, name, email, avatarUrl = null, subscriptionStatus = null }: ClientListItemProps) {
  const router = useRouter();

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
          {email}
        </ThemedText>
      </View>
      {subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'CANCELLED' ? (
        <Chip label={subscriptionStatus === 'CANCELLED' ? 'Cancelled' : 'Expired'} tone="warning" />
      ) : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: Spacing.half,
  },
});
