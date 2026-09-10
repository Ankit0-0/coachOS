import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pill label="Client app" />
        <ThemedText type="title" style={styles.headline}>
          Coach OS
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your plans, your check-ins, and your coach — in one place.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button label="Sign in" onPress={() => router.push('/auth/signin')} fullWidth />
        <Button label="Create an account" variant="secondary" onPress={() => router.push('/auth/signup')} fullWidth />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
  },
  header: {
    gap: Spacing.three,
    paddingTop: Spacing.five,
  },
  headline: {
    marginTop: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
});
