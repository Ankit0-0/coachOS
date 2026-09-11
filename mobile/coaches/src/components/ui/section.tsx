import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type SectionProps = {
  title: string;
  /** Optional right-aligned affordance, e.g. "View all". */
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
};

/**
 * A titled block. Sentence-case weight carries the heading rather than
 * tracked-out caps, and the spacing is owned here so screens stay flat.
 */
export function Section({ title, actionLabel, onActionPress, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="heading">{title}</ThemedText>
        {actionLabel && onActionPress ? (
          <Pressable accessibilityRole="button" onPress={onActionPress} hitSlop={8}>
            <ThemedText type="linkPrimary">{actionLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
