import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDietProgress, HomePlanCard } from '@/utils/dashboard-data';

type PlanCardProps = {
  plan: HomePlanCard;
};

export function PlanCard({ plan }: PlanCardProps) {
  const theme = useTheme();
  const [dietProgress, setDietProgress] = useState(() => (plan.id === 'diet' ? getDietProgress() : null));

  useFocusEffect(
    useCallback(() => {
      if (plan.id === 'diet') {
        setDietProgress(getDietProgress());
      }
    }, [plan.id]),
  );

  const progressPercent = dietProgress ? Math.round(dietProgress.percent) : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${plan.title}`}
      onPress={() => router.push(plan.route)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: theme.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceSunken }]}>
          <SymbolView name={plan.iconName} size={28} tintColor={theme.textSecondary} />
        </View>

        <View style={styles.copy}>
          <ThemedText type="meta">{plan.eyebrow}</ThemedText>
          <ThemedText type="heading">
            {plan.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{plan.summary}</ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="smallBold">{plan.metric}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.detail}>
              {plan.detail}
            </ThemedText>
          </View>
        </View>

        {dietProgress ? (
          <View style={styles.progressWrap}>
            <Svg width={46} height={46} viewBox="0 0 46 46">
              <Circle cx={23} cy={23} r={18} stroke={theme.border} strokeWidth={3} fill="none" />
              <Circle
                cx={23}
                cy={23}
                r={18}
                stroke={theme.accent}
                strokeWidth={3}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 23 23)"
              />
            </Svg>
            <View style={styles.progressValue}>
              <ThemedText type="meta" themeColor="accent">
                {progressPercent}%
              </ThemedText>
            </View>
          </View>
        ) : (
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18}
            tintColor={theme.textSecondary}
          />
        )}
      </ThemedView>
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
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.one,
  },
  metaRow: {
    gap: Spacing.one,
    paddingTop: Spacing.one,
  },
  detail: {
    flexShrink: 1,
  },
  progressWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
