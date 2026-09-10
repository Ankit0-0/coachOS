import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/hooks/use-theme';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Shown inline rather than via Alert, which is a no-op on React Native Web.
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setFormError('Enter your email and password to sign in.');
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      await signIn(email.trim().toLowerCase(), password);
      // The root layout watches isSignedIn and redirects to the app tabs.
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <ThemedText type="linkPrimary">Back</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="meta" themeColor="accent">COACH OS · CLIENT APP</ThemedText>
          <ThemedText type="display">Sign in</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Welcome back.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Email
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="you@example.com"
              placeholderTextColor={theme.textMuted}
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Password
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Your password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth/forgot-password')}
            hitSlop={8}
            style={styles.forgot}>
            <ThemedText type="linkPrimary">Forgot password?</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.actions}>
        {formError ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          </View>
        ) : null}

        <Button label="Sign in" onPress={handleSignIn} loading={isLoading} fullWidth />

        <View style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText type="meta">or</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        <GoogleSignInButton />

        <View style={styles.prompt}>
          <ThemedText type="small" themeColor="textSecondary">
            Don&apos;t have an account?
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/auth/signup')} hitSlop={8}>
            <ThemedText type="linkPrimary">Create one</ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  top: {
    gap: Spacing.four,
  },
  back: {
    alignSelf: 'flex-start',
  },
  header: {
    gap: Spacing.one,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 48,
  },
  actions: {
    gap: Spacing.three,
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  prompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
