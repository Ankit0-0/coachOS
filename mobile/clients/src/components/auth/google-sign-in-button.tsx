import { useAuthRequest } from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';

const GOOGLE_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
};

function platformClientId(): string {
  switch (Platform.OS) {
    case 'ios':
      return GOOGLE_IDS.ios;
    case 'android':
      return GOOGLE_IDS.android;
    default:
      return GOOGLE_IDS.web;
  }
}

function missingClientIdEnvVar(): string {
  switch (Platform.OS) {
    case 'ios':
      return 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';
    case 'android':
      return 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID';
    default:
      return 'EXPO_PUBLIC_GOOGLE_CLIENT_ID';
  }
}

/**
 * Public entry point. Screens can include it unconditionally.
 * - When a client ID is configured for the current platform it starts the
 *   real Google OAuth flow.
 * - Otherwise it renders the button and explains how to enable Google
 *   sign-in on this platform, instead of crashing on a missing ID.
 */
export function GoogleSignInButton() {
  const clientId = platformClientId();
  if (!clientId) return <GoogleNotConfiguredButton />;
  return <GoogleButtonInner clientId={clientId} />;
}

function GoogleNotConfiguredButton() {
  const theme = useTheme();
  const envVar = missingClientIdEnvVar();

  const handlePress = () => {
    Alert.alert(
      'Google sign-in is not configured',
      `Add ${envVar} to mobile/clients/.env for this platform and make sure the client ID is also included in the backend GOOGLE_CLIENT_ID list.`,
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.googleLogo}>
          <View style={[styles.logoBar, { backgroundColor: '#4285F4' }]} />
          <View style={[styles.logoBar, { backgroundColor: '#EA4335' }]} />
          <View style={[styles.logoBar, { backgroundColor: '#FBBC05' }]} />
          <View style={[styles.logoBar, { backgroundColor: '#34A853' }]} />
        </View>
        <ThemedText type="smallBold" themeColor="text">
          Continue with Google
        </ThemedText>
      </View>
    </Pressable>
  );
}

function GoogleButtonInner({ clientId }: { clientId: string }) {
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = useAuthRequest({
    webClientId: GOOGLE_IDS.web || undefined,
    iosClientId: GOOGLE_IDS.ios || undefined,
    androidClientId: GOOGLE_IDS.android || undefined,
    selectAccount: true,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const params = (response.params ?? {}) as Record<string, string | undefined>;
      const idToken = params.id_token;
      if (!idToken) {
        Alert.alert('Google sign-in failed', 'Google did not return an identity token.');
        return;
      }
      setBusy(true);
      signInWithGoogle(idToken)
        .catch((error: unknown) => {
          Alert.alert(
            'Google sign-in failed',
            error instanceof Error ? error.message : 'Something went wrong. Please try again.',
          );
        })
        .finally(() => setBusy(false));
    } else if (response.type === 'error') {
      Alert.alert('Google sign-in failed', 'Something went wrong while signing in with Google.');
    }
    // "dismiss" / "cancel" responses are intentionally ignored.
  }, [response, signInWithGoogle]);

  const handlePress = () => {
    if (busy || !request) return;
    promptAsync();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={busy || !request}
      style={({ pressed }) => [
        styles.button,
        { borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.content}>
        {busy ? (
          <ActivityIndicator color={theme.textSecondary} size="small" />
        ) : (
          <>
            <View style={styles.googleLogo}>
              <View style={[styles.logoBar, { backgroundColor: '#4285F4' }]} />
              <View style={[styles.logoBar, { backgroundColor: '#EA4335' }]} />
              <View style={[styles.logoBar, { backgroundColor: '#FBBC05' }]} />
              <View style={[styles.logoBar, { backgroundColor: '#34A853' }]} />
            </View>
            <ThemedText type="smallBold" themeColor="text">
              Continue with Google
            </ThemedText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  googleLogo: {
    flexDirection: 'row',
    gap: 3,
    padding: 4,
  },
  logoBar: {
    width: 8,
    height: 18,
    borderRadius: 2,
  },
});
