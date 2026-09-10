import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setFormError('Enter the email address on your account.');
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      await authApi.forgotPassword(trimmed);
      // The server deliberately answers the same way whether or not the
      // address is registered, so always continue to the code step.
      router.push({ pathname: '/auth/reset-password', params: { email: trimmed } });
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
          <ThemedText type="display">Reset password</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            We&apos;ll email you an 8-character code to set a new password.
          </ThemedText>
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
      </View>

      <View style={styles.actions}>
        {formError ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="small" themeColor="danger">
              {formError}
            </ThemedText>
          </View>
        ) : null}

        <Button label="Send code" onPress={handleSend} loading={isLoading} fullWidth />

        <View style={styles.prompt}>
          <ThemedText type="small" themeColor="textSecondary">
            Already have a code?
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth/reset-password')}
            hitSlop={8}>
            <ThemedText type="linkPrimary">Enter it</ThemedText>
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
  },
  errorBanner: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
  },
  prompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
