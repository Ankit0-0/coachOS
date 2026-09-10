import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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

export default function SignUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Shown inline rather than via Alert, which is a no-op on React Native Web.
  const [formError, setFormError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setFormError('Fill in every field to create your account.');
      return;
    }

    if (password.length < 8) {
      setFormError('Use at least 8 characters for your password.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Those passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      await signUp(email.trim().toLowerCase(), password, name.trim());
      // The root layout watches isSignedIn and redirects to the app tabs.
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <ThemedText type="linkPrimary">Back</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="meta" themeColor="accent">COACH OS · CLIENT APP</ThemedText>
          <ThemedText type="display">Create account</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Track your plans and check in with your coach.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Full name
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="How clients will see you"
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

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
              placeholder="At least 8 characters"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Confirm password
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Repeat your password"
              placeholderTextColor={theme.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
              secureTextEntry
            />
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

          <Button label="Create account" onPress={handleSignUp} loading={isLoading} fullWidth />

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ThemedText type="meta">or</ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

          <GoogleSignInButton />

          <View style={styles.prompt}>
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account?
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth/signin')} hitSlop={8}>
              <ThemedText type="linkPrimary">Sign in</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
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
    marginTop: 'auto',
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
