import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** A card on Home for one of the client's real, active assignments. */
export type HomePlanCard = {
  id: 'workout' | 'diet';
  /** "Workout" or "Diet". The icon says it on screen; this says it to a screen reader. */
  kind: string;
  title: string;
  /** "Day 3 of 7 · Pull" — which day of the cycle today is. */
  dayLabel: string;
  /** A scheduled rest day shows a neutral marker, never a 0% ring. */
  isRestDay: boolean;
  /** The one supporting line under the title. */
  summary: string;
  /** Short facts, each carrying its unit: "24 min", "4 exercises". */
  chips: string[];
  route: '/workout' | '/diet';
  iconName: SymbolName;
  /** 0–100 from today's check-in. Always drawn — an empty ring at 0, never a missing one. */
  progressPercent: number;
  /** What the ring counts, for a screen reader: "3 of 12 sets done today". */
  progressLabel: string;
};

type PlanCardProps = {
  plan: HomePlanCard;
};

const RING_SIZE = 46;
const RING_RADIUS = 18;
const RING_STROKE = 3;

/**
 * Title first, one line of summary under it, then the plan's figures as muted
 * chips — and today's progress as the same ring on every card, so a workout and
 * a diet read alike. Focus notes and exercise or meal lists live on the plan's
 * own screen.
 */
export function PlanCard({ plan }: PlanCardProps) {
  const theme = useTheme();
  const percent = Math.max(0, Math.min(100, Math.round(plan.progressPercent)));
  const circumference = 2 * Math.PI * RING_RADIUS;
  const center = RING_SIZE / 2;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan.kind} plan: ${plan.title}. ${plan.progressLabel}. Open plan`}
      onPress={() => router.push(plan.route)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <Card style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSunken }]}>
          <SymbolView name={plan.iconName} size={22} tintColor={theme.textSecondary} />
        </View>

        <View style={styles.copy}>
          {plan.dayLabel ? <ThemedText type="meta">{plan.dayLabel}</ThemedText> : null}
          <ThemedText type="heading" numberOfLines={2}>
            {plan.title}
          </ThemedText>
          {plan.summary ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {plan.summary}
            </ThemedText>
          ) : null}
          {plan.chips.length > 0 ? (
            <View style={styles.chips}>
              {plan.chips.map((chip) => (
                <Pill key={chip} label={chip} />
              ))}
            </View>
          ) : null}
        </View>

        {plan.isRestDay ? (
          // A rest day is scheduled, so it gets its own marker: an empty ring
          // here would read as a day the client failed.
          <View style={[styles.ring, styles.restMarker, { borderColor: theme.border }]} aria-hidden>
            <ThemedText type="meta" themeColor="textSecondary">
              Rest
            </ThemedText>
          </View>
        ) : (
        <View style={styles.ring} aria-hidden>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Circle cx={center} cy={center} r={RING_RADIUS} stroke={theme.border} strokeWidth={RING_STROKE} fill="none" />
            {percent > 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={RING_RADIUS}
                stroke={theme.accent}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (percent / 100) * circumference}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
            ) : null}
          </Svg>
          <View style={styles.ringValue}>
            <ThemedText type="meta" themeColor={percent > 0 ? 'accent' : 'textMuted'}>
              {percent}%
            </ThemedText>
          </View>
        </View>
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
    opacity: 0.72,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restMarker: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
