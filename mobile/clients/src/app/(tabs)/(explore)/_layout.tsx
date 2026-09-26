import { Stack } from 'expo-router';

// Root beneath deep links and reloads, so back always lands on the tab's root.
export const unstable_settings = { initialRouteName: 'explore-coaches' };

/**
 * The Explore tab's own stack, so a coach's profile opens inside the tab and
 * the tab bar stays on screen.
 *
 * Not a `(tabs)` sibling with `href: null`: this app uses NativeTabs, where a
 * route without a trigger is a hidden tab that can't be navigated to at all.
 */
export default function ExploreStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
