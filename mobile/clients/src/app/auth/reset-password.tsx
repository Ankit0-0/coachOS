import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedEmail || !trimmedCode || !password || !confirmPassword) {
      setFormError('Fill in every field to set a new password.');
      return;
    }
    if (trimmedCode.length !== 8) {
      setFormError('The code is 8 characters long.');
      return;
    }
    if (password.length < 8) {
      setFormError('Use at least 8 characters for your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Those passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setFormError(null);
      await authApi.resetPassword({ email: trimmedEmail, code: trimmedCode, newPassword: password });
      setDone(true);
    } catch {
      // The server won't say whether the code was wrong, expired, or already
      // used, so cover all three here.
      setFormError('That code didn’t work. It may have expired or already been used — request a new one.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.top}>
          <View style={styles.header}>
            <ThemedText type="display">Password updated</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              You can sign in with your new password now.
            </ThemedText>
          </View>
        </View>
        <Button label="Back to sign in" onPress={() => router.replace('/auth/signin')} fullWidth />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8} style={styles.back}>
          <ThemedText type="linkPrimary">Back</ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="display">Enter your code</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Check your email for the 8-character code. It expires 15 minutes after you asked for it.
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
              Reset code
            </ThemedText>
            <TextInput
              style={[styles.input, styles.codeInput, { borderColor: theme.border, color: theme.text }]}
              placeholder="ABCD2345"
              placeholderTextColor={theme.textMuted}
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              editable={!isLoading}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              New password
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
              Confirm new password
            </ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Repeat your new password"
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

          <Button label="Set new password" onPress={handleReset} loading={isLoading} fullWidth />

          <View style={styles.prompt}>
            <ThemedText type="small" themeColor="textSecondary">
              Need another code?
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/auth/forgot-password')}
              hitSlop={8}>
              <ThemedText type="linkPrimary">Request one</ThemedText>
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
    justifyContent: 'space-between',
    padding: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 48,
  },
  codeInput: {
    letterSpacing: 4,
  },
  actions: {
    gap: Spacing.three,
    marginTop: 'auto',
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
