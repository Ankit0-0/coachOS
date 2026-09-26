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
      {/* Each tab is a group with its own Stack, so pushed screens keep the bar. */}
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Clients</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          md={{ default: 'group', selected: 'group' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(plans)">
        <NativeTabs.Trigger.Label>Plans</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'doc.text', selected: 'doc.text.fill' }}
          md={{ default: 'description', selected: 'description' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md={{ default: 'account_circle', selected: 'account_circle' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
