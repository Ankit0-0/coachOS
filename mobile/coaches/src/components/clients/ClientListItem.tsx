import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ClientListItemProps = {
  clientId: string;
  name: string;
  email: string;
};

export function ClientListItem({ clientId, name, email }: ClientListItemProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/clients/[id]', params: { id: clientId, name, email } })
      }>
      <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {email}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
