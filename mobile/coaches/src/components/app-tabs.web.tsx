import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { ComponentProps } from 'react';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type TabIconName = ComponentProps<typeof SymbolView>['name'];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href={'/' as never} asChild>
            <TabButton
              label="Clients"
              iconName={{ ios: 'person.2', android: 'group', web: 'group' }}
            />
          </TabTrigger>
          <TabTrigger name="saved-plans" href="/saved-plans" asChild>
            <TabButton
              label="Plans"
              iconName={{ ios: 'doc.text', android: 'description', web: 'description' }}
            />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton
              label="Profile"
              iconName={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }}
            />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  iconName,
  isFocused,
  label,
  ...props
}: TabTriggerSlotProps & { iconName: TabIconName; label: string }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedView type="background" style={styles.tabButtonView}>
        <SymbolView
          name={iconName}
          size={22}
          tintColor={isFocused ? colors.accent : colors.textSecondary}
        />
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'} style={styles.tabLabel}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={[styles.tabListContainer, { backgroundColor: colors.background }]}>
      <ThemedView type="background" style={[styles.innerContainer, { borderTopColor: colors.border }]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-around',
    maxWidth: MaxContentWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 48,
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
