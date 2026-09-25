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
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabIconName = ComponentProps<typeof SymbolView>['name'];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href={'/' as never} asChild>
            <TabButton label="Home" iconName={{ ios: 'house', android: 'home', web: 'home' }} />
          </TabTrigger>
          <TabTrigger name="explore-coaches" href="/explore-coaches" asChild>
            <TabButton
              label="Explore"
              iconName={{ ios: 'magnifyingglass.circle', android: 'person_search', web: 'person_search' }}
            />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton
              label="Me"
              iconName={{ ios: 'person.circle', android: 'account_circle', web: 'account_circle' }}
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
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonView, isFocused && { backgroundColor: theme.tabActiveBg }]}>
        <SymbolView name={iconName} size={22} tintColor={isFocused ? theme.primary : theme.textMuted} />
        <ThemedText type="chip" themeColor={isFocused ? 'primary' : 'textMuted'} style={styles.tabLabel}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();

  return (
    <View {...props} style={[styles.tabListContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <View style={styles.innerContainer}>{props.children}</View>
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
    borderTopWidth: 1,
  },
  innerContainer: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'space-around',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
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
    minHeight: 52,
    borderRadius: Radii.lg,
  },
  tabLabel: {
    textAlign: 'center',
  },
});
