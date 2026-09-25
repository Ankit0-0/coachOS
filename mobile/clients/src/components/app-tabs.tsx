import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTabBarColors } from '@coachos/theme';

export default function AppTabs() {
  // Surface bar; the active tab gets the sage pill (Android indicator).
  const colors = useTabBarColors();

  return (
    <NativeTabs
      backgroundColor={colors.backgroundColor}
      indicatorColor={colors.indicatorColor}
      iconColor={colors.iconColor}
      labelStyle={colors.labelStyle}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home_filled' }}
        />
      </NativeTabs.Trigger>

      {/* A group with its own Stack, so a coach's profile opens inside this tab. */}
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'magnifyingglass.circle', selected: 'magnifyingglass.circle.fill' }}
          md={{ default: 'person_search', selected: 'person_search' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.circle', selected: 'person.circle.fill' }}
          md={{ default: 'account_circle', selected: 'account_circle' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
