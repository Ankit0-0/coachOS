import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ClientListItemProps = {
  clientId: string;
  name: string;
  email: string;
  /** Rows sit inside one shared card, so all but the last carry a divider. */
  divider?: boolean;
};

export function ClientListItem({ clientId, name, email, divider = false }: ClientListItemProps) {
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
