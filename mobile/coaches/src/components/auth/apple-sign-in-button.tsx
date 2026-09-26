import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { Radii } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useAppearance, useTheme } from '@/hooks/use-theme';

/*
  Sign in with Apple, iOS only. App Store rule 4.8: an app that offers Google
  sign-in must also offer this. Apple's own button is required (its look is
  part of Apple's guidelines), so it is not a themed Button.
*/

const BUTTON_HEIGHT = 48;

/** Apple sends the name to the app on the first sign-in only, and never in the token. */
function fullNameOf(credential: AppleAuthentication.AppleAuthenticationCredential): string | undefined {
  const parts = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

export function AppleSignInButton() {
  const theme = useTheme();
  const { scheme } = useAppearance();
  const { signInWithApple } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (active) setIsAvailable(available);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!isAvailable) return null;

  const handlePress = async () => {
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple did not return an identity token. Please try again.');
      await signInWithApple(credential.identityToken, fullNameOf(credential));
    } catch (error) {
      // Closing Apple's sheet is not an error.
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert(
        'Apple sign-in failed',
        error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View style={[styles.busy, { borderColor: theme.border }]}>
        <ActivityIndicator color={theme.textSecondary} size="small" />
      </View>
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        scheme === 'dark'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={Radii.md}
      style={styles.button}
      onPress={() => void handlePress()}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: BUTTON_HEIGHT,
  },
  busy: {
    height: BUTTON_HEIGHT,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
