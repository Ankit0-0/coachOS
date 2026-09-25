import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { KeyboardForm } from '@/components/ui/keyboard-form';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <KeyboardForm contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Chip label="Coach app" tone="green" />
          <ThemedText type="title" style={styles.headline}>
            Coach OS
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Your roster, your plans, and how every client is actually doing — in one place.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button label="Sign in" onPress={() => router.push('/auth/signin')} fullWidth />
          <Button label="Create an account" variant="secondary" onPress={() => router.push('/auth/signup')} fullWidth />
        </View>
      </KeyboardForm>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
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
