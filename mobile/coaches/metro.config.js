// Sentry's Expo config: the default Metro config plus debug IDs in the bundle and
// source maps, which is how Sentry matches an uploaded source map to a crash.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withThemePackage } = require('@coachos/theme/metro');

module.exports = withThemePackage(getSentryExpoConfig(__dirname), __dirname);
