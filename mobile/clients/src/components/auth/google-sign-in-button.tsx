import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { GoogleButtonFace } from '@/components/auth/google-button-face';
import { useAuth } from '@/contexts/auth';

/*
  Native Google Sign-In (iOS and Android). The web build uses
  google-sign-in-button.web.tsx instead.

  The id token is minted for the *web* client ID (webClientId), which is what
  the backend verifies against — so EXPO_PUBLIC_GOOGLE_CLIENT_ID is needed on
  every platform. iOS additionally needs its own client ID, whose reversed form
  app.config.ts registers as a URL scheme. Android needs no client ID in the
  app, but Google Cloud must have an Android OAuth client for this package name
  and the signing certificate's SHA-1 (from `eas credentials`), or sign-in
  fails with DEVELOPER_ERROR.
*/

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';

function missingSetting(): string | null {
  if (!WEB_CLIENT_ID) return 'EXPO_PUBLIC_GOOGLE_CLIENT_ID';
  if (Platform.OS === 'ios' && !IOS_CLIENT_ID) return 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';
  return null;
}

let isConfigured = false;
function configureOnce() {
  if (isConfigured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}) });
  isConfigured = true;
}

/** Forgets the Google account on this device, so the next sign-in offers the account picker again. */
export async function signOutOfGoogle(): Promise<void> {
  if (!isConfigured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device: nothing to forget.
  }
}

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const missing = missingSetting();

  if (missing) {
    // A store build without the setting simply has no Google button; a
    // development build says what to add.
    if (!__DEV__) return null;
    return (
      <GoogleButtonFace
        onPress={() =>
          Alert.alert(
            'Google sign-in is not configured',
            `Add ${missing} to this app's .env and include the client ID in the backend's GOOGLE_CLIENT_ID list.`,
          )
        }
      />
    );
  }

  const handlePress = async () => {
    configureOnce();
    setBusy(true);
    try {
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // They closed the account picker.
      const idToken = response.data.idToken;
      if (!idToken) throw new Error('Google did not return an identity token. Please try again.');
      await signInWithGoogle(idToken);
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Google sign-in unavailable', 'Google Play services is missing or out of date on this device.');
          return;
        }
      }
      Alert.alert(
        'Google sign-in failed',
        error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return <GoogleButtonFace busy={busy} onPress={() => void handlePress()} />;
}
