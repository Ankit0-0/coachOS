import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconTile, ProgressBar } from '@coachos/theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** A card on Home for one of the client's real, active assignments. */
export type HomePlanCard = {
  id: 'workout' | 'diet';
  /** "Workout" or "Diet". */
  kind: string;
  title: string;
  /** The coach's name for today, "Pull" or "Easy day"; empty when they gave none. */
  dayLabel: string;
  /** A scheduled rest day shows a neutral marker, never an empty bar. */
  isRestDay: boolean;
  /** The one supporting line under the title. */
  summary: string;
  /** Short facts, each carrying its unit: "24 min", "4 exercises". */
  chips: string[];
  route: '/workout' | '/diet';
  iconName: SymbolName;
  /** 0–100 from today's check-in. */
  progressPercent: number;
  /** "3 of 12 sets done today". */
  progressLabel: string;
};

type PlanCardProps = {
  plan: HomePlanCard;
};

const CHEVRON: SymbolName = { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' };

/**
 * Landing card style: icon tile and kind chip, title, figures as chips, then
 * today's progress. Workout is sage, diet terracotta.
 */
export function PlanCard({ plan }: PlanCardProps) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, Math.round(plan.progressPercent)));
  const isDiet = plan.id === 'diet';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan.kind} plan: ${plan.title}. ${plan.progressLabel}. Open plan`}
      onPress={() => router.push(plan.route)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <IconTile icon={plan.iconName} tone={isDiet ? 'terracotta' : 'green'} />
          {/* The icon tile already says workout or diet; the pill only names the day. */}
          <View style={styles.kind}>
            {plan.dayLabel ? <Chip label={plan.dayLabel} tone={isDiet ? 'terracotta' : 'green'} singleLine /> : null}
          </View>
          <SymbolView name={CHEVRON} size={18} tintColor={theme.textMuted} />
        </View>

        <View style={styles.copy}>
          <ThemedText type="heading" numberOfLines={2}>
            {plan.title}
          </ThemedText>
          {plan.summary ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {plan.summary}
            </ThemedText>
          ) : null}
        </View>

        {plan.chips.length > 0 ? (
          <View style={styles.chips}>
            {plan.chips.map((chip) => (
              <Chip key={chip} label={chip} tone="neutral" />
            ))}
          </View>
        ) : null}

        {plan.isRestDay ? (
          // Scheduled rest, so no empty bar that reads as a missed day.
          <Chip label="Rest day" tone="neutral" />
        ) : (
          <ProgressBar
            value={percent / 100}
            color={isDiet ? 'chartDiet' : 'chartWorkout'}
            label={plan.progressLabel}
            detail={`${percent}%`}
          />
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    gap: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  kind: {
    flex: 1,
    minWidth: 0,
  },
  copy: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
