import { useRouter } from 'expo-router';
import { StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="accent" style={styles.logo}>
          Coach OS
        </ThemedText>
        <ThemedView type="accentSoft" style={styles.appBadge}>
          <ThemedText type="small" themeColor="accent" style={styles.appBadgeText}>
            Client App
          </ThemedText>
        </ThemedView>
        <ThemedText type="subtitle" style={styles.title}>
          Your Personal Training Hub
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Get expert guidance on workouts and nutrition
        </ThemedText>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/auth/signin')}
        >
          <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
            Sign In
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.button, { borderColor: theme.border, borderWidth: 1 }]}
          onPress={() => router.push('/auth/signup')}
        >
          <ThemedText type="smallBold" themeColor="accent">
            Sign Up
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.three,
    paddingTop: Spacing.six,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    fontSize: 24,
  },
  appBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  appBadgeText: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
