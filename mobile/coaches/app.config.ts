import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the static config; this adds the parts that depend on
 * build-time environment variables (set per build profile in EAS):
 *
 * - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: native Google Sign-In on iOS returns to
 *   the app through the reversed client ID as a URL scheme. Without it the
 *   plugin is left out and the Google button explains it isn't set up.
 * - GOOGLE_SERVICES_JSON: an EAS "file" variable with Firebase's
 *   google-services.json, which Android needs to receive push notifications.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON?.trim();

  const plugins = [...(config.plugins ?? [])];
  if (iosClientId) {
    const reversed = `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
    plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme: reversed }]);
  }

  return {
    ...config,
    name: config.name ?? 'CoachOS',
    slug: config.slug ?? 'coaches',
    plugins,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
