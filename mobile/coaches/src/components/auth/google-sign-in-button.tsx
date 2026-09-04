import { useAuthRequest } from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/auth';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="-3 0 262 262">
      <Path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <Path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <Path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <Path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </Svg>
  );
}

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
      `Add ${envVar} to mobile/coaches/.env for this platform and make sure the client ID is also included in the backend GOOGLE_CLIENT_ID list.`,
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
        <GoogleIcon />
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
            <GoogleIcon />
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
});
