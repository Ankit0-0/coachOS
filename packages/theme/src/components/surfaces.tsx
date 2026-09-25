import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '../provider';
import { Radii, Spacing } from '../tokens';
import { ThemedText } from './text';

type CardProps = ViewProps & {
  /**
   * `raised`: a card on the page (landing: white, rounded-3xl, border, soft shadow).
   * `inset`: a block nested in a raised card, on the inset tint.
   */
  variant?: 'raised' | 'inset';
  padded?: boolean;
};

export function Card({ variant = 'raised', padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();
  const raised = variant === 'raised';
  return (
    <View
      style={[
        raised ? styles.raised : styles.inset,
        {
          backgroundColor: raised ? theme.surface : theme.surfaceInset,
          borderColor: theme.border,
        },
        raised && theme.cardShadow !== 'none' && { boxShadow: theme.cardShadow },
        padded && (raised ? styles.raisedPadding : styles.insetPadding),
        style,
      ]}
      {...rest}
    />
  );
}

/** The tray inside a card that holds rows (landing: `rounded-2xl bg-cream p-4`). */
export function InsetPanel({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.panel, { backgroundColor: theme.surfaceInset }, style]} {...rest} />;
}

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type RowProps = {
  children: ReactNode;
  onPress?: () => void;
  /** Adds a trailing chevron; implied by onPress unless set false. */
  chevron?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const CHEVRON: SymbolName = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' };

/** A row inside an InsetPanel (landing: `rounded-xl bg-white ring-1`). */
export function Row({ children, onPress, chevron, accessibilityLabel, accessibilityHint, disabled, style }: RowProps) {
  const theme = useTheme();
  const showChevron = chevron ?? Boolean(onPress);
  const frame = [styles.row, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  const content = (
    <>
      {children}
      {showChevron ? <SymbolView name={CHEVRON} size={16} tintColor={theme.textMuted} /> : null}
    </>
  );
  if (!onPress) return <View style={frame}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [frame, pressed && { backgroundColor: theme.surfaceInset }]}>
      {content}
    </Pressable>
  );
}

type SectionProps = {
  title: string;
  /** Optional right-aligned affordance, e.g. "View all". */
  actionLabel?: string;
  onActionPress?: () => void;
  /** Right-aligned element in place of an action, e.g. a count chip. */
  trailing?: ReactNode;
  children?: ReactNode;
};

export function SectionHeader({ title, actionLabel, onActionPress, trailing }: Omit<SectionProps, 'children'>) {
  return (
    <View style={styles.header}>
      <ThemedText type="heading" accessibilityRole="header" style={styles.headerTitle}>
        {title}
      </ThemedText>
      {trailing}
      {actionLabel && onActionPress ? (
        <Pressable accessibilityRole="button" onPress={onActionPress} hitSlop={12}>
          <ThemedText type="linkPrimary">{actionLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** A titled block; owns the gap between heading and content. */
export function Section({ children, ...header }: SectionProps) {
  return (
    <View style={styles.section}>
      <SectionHeader {...header} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  raised: {
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  inset: {
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  raisedPadding: {
    padding: Spacing.threeHalf,
  },
  insetPadding: {
    padding: Spacing.three,
  },
  panel: {
    borderRadius: Radii.lg,
    padding: Spacing.twoHalf,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  section: {
    gap: Spacing.twoHalf,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    flex: 1,
  },
});
