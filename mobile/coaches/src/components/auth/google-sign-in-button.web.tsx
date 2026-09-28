import { useAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { GoogleButtonFace } from '@/components/auth/google-button-face';
import { useAuth } from '@/contexts/auth';

/*
  Web build only: Google's OAuth popup through expo-auth-session. iOS and
  Android use native Google Sign-In (google-sign-in-button.tsx).
*/

// Lets the popup window hand its result back to this page and close.
WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

/** Nothing to forget on web: the session lives in the browser's Google cookie. */
export async function signOutOfGoogle(): Promise<void> {}

/** Alert is a no-op in React Native Web. */
function showError(message: string) {
  window.alert(`Google sign-in failed\n\n${message}`);
}

export function GoogleSignInButton() {
  if (!WEB_CLIENT_ID) {
    if (!__DEV__) return null;
    return (
      <GoogleButtonFace
        onPress={() =>
          window.alert(
            "Google sign-in is not configured.\n\nAdd EXPO_PUBLIC_GOOGLE_CLIENT_ID to this app's .env and include it in the backend's GOOGLE_CLIENT_ID list.",
          )
        }
      />
    );
  }
  return <GoogleWebButton />;
}

function GoogleWebButton() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = useAuthRequest({ webClientId: WEB_CLIENT_ID, selectAccount: true });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      // The implicit flow puts it in params; a code exchange puts it on authentication.
      const idToken = response.params.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        showError('Google did not return an identity token.');
        return;
      }
      // Reacting to the OAuth redirect, an external event.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusy(true);
      signInWithGoogle(idToken)
        .catch((error: unknown) => showError(error instanceof Error ? error.message : 'Something went wrong. Please try again.'))
        .finally(() => setBusy(false));
    } else if (response.type === 'error') {
      showError('Something went wrong while signing in with Google.');
    }
    // "dismiss" / "cancel" are someone closing the popup: nothing to say.
  }, [response, signInWithGoogle]);

  return <GoogleButtonFace busy={busy} disabled={!request} onPress={() => void promptAsync()} />;
}
