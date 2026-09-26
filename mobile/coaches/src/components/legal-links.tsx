import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { LEGAL_LINKS } from '@/constants/links';

function open(url: string) {
  void WebBrowser.openBrowserAsync(url);
}

/**
 * "Privacy policy · Terms of use", opened in an in-app browser. With a
 * `prefix` it reads as the consent line under a sign-up button.
 */
export function LegalLinks({ prefix }: { prefix?: string }) {
  if (!LEGAL_LINKS) return null;
  const links = LEGAL_LINKS;
  return (
    <View style={styles.row}>
      {prefix ? (
        <ThemedText type="meta" style={styles.center}>
          {prefix}
        </ThemedText>
      ) : null}
      <View style={styles.links}>
        <Pressable accessibilityRole="link" onPress={() => open(links.terms)} hitSlop={12}>
          <ThemedText type="linkPrimary">Terms of use</ThemedText>
        </Pressable>
        <ThemedText type="meta">·</ThemedText>
        <Pressable accessibilityRole="link" onPress={() => open(links.privacy)} hitSlop={12}>
          <ThemedText type="linkPrimary">Privacy policy</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
