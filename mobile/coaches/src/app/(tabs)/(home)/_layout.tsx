import { Stack } from 'expo-router';

// Root beneath deep links and reloads, so back always lands on the tab's root.
export const unstable_settings = { initialRouteName: 'index' };

/** The Clients tab's own stack: client screens push here and the tab bar stays. */
export default function HomeStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
