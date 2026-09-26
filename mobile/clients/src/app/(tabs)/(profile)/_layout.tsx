import { Stack } from 'expo-router';

// Root beneath deep links and reloads, so back always lands on the tab's root.
export const unstable_settings = { initialRouteName: 'profile' };

/** The Me tab's own stack, so History opened from here stays in this tab. */
export default function ProfileStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
