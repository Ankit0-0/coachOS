import { Image } from 'expo-image';
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

import { MaxContentWidth, Radii, SidebarWidth, Spacing } from '@/constants/theme';
import { useDesktopLayout, useTheme } from '@/hooks/use-theme';

type TabIconName = ComponentProps<typeof SymbolView>['name'];

const APP_ICON = require('@/assets/images/icon.png');

/** A bottom bar at phone width; a left sidebar on a desktop browser. */
export default function AppTabs() {
  const isDesktop = useDesktopLayout();

  // The list comes first so it leads the keyboard order; the bottom bar is absolute, so order doesn't move it.
  return (
    <Tabs style={[styles.root, isDesktop && styles.sidebarRoot]}>
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
      <TabSlot style={styles.slot} />
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
  const isDesktop = useDesktopLayout();

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [isDesktop ? styles.sidebarButton : styles.tabButton, pressed && styles.pressed]}>
      <View
        style={[
          isDesktop ? styles.sidebarButtonView : styles.tabButtonView,
          isFocused && { backgroundColor: theme.tabActiveBg },
        ]}>
        <SymbolView name={iconName} size={22} tintColor={isFocused ? theme.primary : theme.textMuted} />
        <ThemedText
          type={isDesktop ? 'smallBold' : 'chip'}
          themeColor={isFocused ? 'primary' : isDesktop ? 'textSecondary' : 'textMuted'}
          style={!isDesktop && styles.tabLabel}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const isDesktop = useDesktopLayout();

  if (isDesktop) {
    return (
      <View {...props} style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
        <View style={styles.brand}>
          <Image source={APP_ICON} style={styles.brandIcon} accessibilityIgnoresInvertColors />
          <View>
            <ThemedText type="heading">CoachOS</ThemedText>
            <ThemedText type="meta">Coach</ThemedText>
          </View>
        </View>
        <View style={styles.sidebarItems}>{props.children}</View>
      </View>
    );
  }

  return (
    <View {...props} style={[styles.tabListContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <View style={styles.innerContainer}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sidebarRoot: {
    flexDirection: 'row',
  },
  slot: {
    height: '100%',
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    // Above the focused screen, which the slot raises to 1.
    zIndex: 2,
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
  sidebar: {
    width: SidebarWidth,
    height: '100%',
    borderRightWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.five,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.two,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
  },
  sidebarItems: {
    gap: Spacing.one,
  },
  sidebarButton: {
    alignSelf: 'stretch',
  },
  sidebarButtonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: 44,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radii.md,
  },
});
