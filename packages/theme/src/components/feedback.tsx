import { SymbolView } from 'expo-symbols';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../provider';
import type { ThemeColor } from '../themes';
import { Radii, Spacing } from '../tokens';
import { ThemedText } from './text';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const INFO_ICON: SymbolName = { ios: 'info.circle', android: 'info', web: 'info' };

/** Notice box (landing: "Plan updated…", `bg-terracotta-soft text-charcoal`). */
export function Callout({ children, icon = INFO_ICON }: { children: ReactNode; icon?: SymbolName | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.callout, { backgroundColor: theme.calloutBg }]}>
      {icon ? <SymbolView name={icon} size={16} tintColor={theme.chipWarmText} /> : null}
      <View style={styles.calloutBody}>
        {typeof children === 'string' ? (
          <ThemedText type="small" themeColor="calloutText">
            {children}
          </ThemedText>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Long enough to read a short sentence. */
const AUTO_DISMISS_MS = 4000;

type InlineNoticeProps = {
  /** Nothing renders while this is null. */
  message: string | null;
  onDismiss: () => void;
};

/** A small, self-dismissing note for a minor, recoverable problem. */
export function InlineNotice({ message, onDismiss }: InlineNoticeProps) {
  const theme = useTheme();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: theme.calloutBg }]}>
      <SymbolView
        name={{ ios: 'exclamationmark.circle', android: 'error', web: 'error' }}
        size={14}
        tintColor={theme.warning}
      />
      <ThemedText type="meta" themeColor="calloutText" style={styles.noticeText}>
        {message}
      </ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} hitSlop={14}>
        <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={12} tintColor={theme.textMuted} />
      </Pressable>
    </View>
  );
}

type ProgressBarProps = {
  /** 0..1; clamped. */
  value: number;
  color?: ThemeColor;
  /** Shown above the bar, left; `detail` goes right. */
  label?: string;
  detail?: string;
  accessibilityLabel?: string;
};

export function ProgressBar({ value, color = 'chartBar', label, detail, accessibilityLabel }: ProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      style={styles.progress}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label || detail ? (
        <View style={styles.progressLabels}>
          {label ? (
            <ThemedText type="meta" themeColor="textSecondary">
              {label}
            </ThemedText>
          ) : null}
          {detail ? (
            <ThemedText type="meta" themeColor="textMuted" style={styles.tabular}>
              {detail}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: theme.chartEmpty }]}>
        <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: theme[color] }]} />
      </View>
    </View>
  );
}

type FieldRowProps = {
  label: string;
  /** Falls back to a muted "Not set" when empty. */
  value?: string | null | undefined;
  /** Long values stack under the label instead of sitting beside it. */
  stacked?: boolean;
  divider?: boolean;
};

export function FieldRow({ label, value, stacked = false, divider = true }: FieldRowProps) {
  const theme = useTheme();
  const isEmpty = value === null || value === undefined || value.trim() === '';

  return (
    <View style={[styles.fieldRow, divider && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={stacked ? styles.stacked : styles.inline}>
        <ThemedText type="label" themeColor="textMuted">
          {label}
        </ThemedText>
        <ThemedText
          type={stacked ? 'small' : 'smallBold'}
          themeColor={isEmpty ? 'textMuted' : 'textPrimary'}
          style={stacked ? undefined : styles.inlineValue}>
          {isEmpty ? 'Not set' : value}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.twoHalf,
  },
  calloutBody: {
    flex: 1,
    gap: Spacing.one,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
  },
  noticeText: {
    flexShrink: 1,
  },
  progress: {
    gap: Spacing.one + Spacing.half,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  fieldRow: {
    paddingVertical: Spacing.twoHalf,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  stacked: {
    gap: Spacing.one,
  },
  inlineValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
