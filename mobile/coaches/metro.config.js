// Sentry's Expo config: the default Metro config plus debug IDs in the bundle and
// source maps, which is how Sentry matches an uploaded source map to a crash.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
