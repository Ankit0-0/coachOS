import { Stack } from 'expo-router';

// Root beneath deep links and reloads, so back always lands on the tab's root.
export const unstable_settings = { initialRouteName: 'saved-plans' };

/** The Plans tab's own stack: plan lists and the editor push here and the tab bar stays. */
export default function PlansStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
