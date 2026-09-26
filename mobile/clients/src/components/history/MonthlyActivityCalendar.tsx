import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DailyActivity = {
  date: number;
  workoutCompleted: number;
  workoutTotal: number;
  dietCompleted: number;
  dietTotal: number;
  /** A scheduled rest day: marked as rest, never as an unfilled ring. */
  isRestDay?: boolean;
};

type MonthlyActivityCalendarProps = {
  entries: DailyActivity[];
  daysInMonth?: number;
  /**
   * Weekday the 1st of the month falls on, 0 = Sunday. Without it the grid
   * puts day 1 in the Sunday column whatever month it is, so every date sits
   * under the wrong weekday.
   */
  firstWeekday?: number;
  /** Opens a day; without it the calendar is display-only. */
  onDayPress?: (dayNumber: number) => void;
  /** Days after this one are not pressable: they have not happened yet. */
  lastPressableDay?: number;
};

const weekDays = [
  { key: 'sun', label: 'S' },
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
];

export function MonthlyActivityCalendar({
  entries,
  daysInMonth = 30,
  firstWeekday = 0,
  onDayPress,
  lastPressableDay = daysInMonth,
}: MonthlyActivityCalendarProps) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.weekRow}>
        {weekDays.map((day) => (
          <View key={day.key} style={styles.weekDay}>
            <ThemedText type="meta" themeColor="chartAxis">
              {day.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {/* Blanks so the 1st lands under its real weekday. */}
        {Array.from({ length: firstWeekday }, (_, index) => (
          <View key={`lead-${index}`} style={styles.dayCell} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((dayNumber) => {
          const entry = entries.find((item) => item.date === dayNumber);
          const workoutPct = entry ? entry.workoutCompleted / Math.max(entry.workoutTotal, 1) : 0;
          const dietPct = entry ? entry.dietCompleted / Math.max(entry.dietTotal, 1) : 0;
          const hasWorkout = workoutPct > 0;
          const hasDiet = dietPct > 0;
          const isActive = hasWorkout || hasDiet;
          // Rest is a plan state, not a miss — unless something was logged
          // anyway, in which case show what was done.
          const isRest = Boolean(entry?.isRestDay) && !isActive;
          const isPressable = onDayPress !== undefined && dayNumber <= lastPressableDay;
          const summary = isRest
            ? 'rest day'
            : `workout ${Math.round(workoutPct * 100)}%, diet ${Math.round(dietPct * 100)}%`;

          const ringRadius = 9;
          const ringCircumference = 2 * Math.PI * ringRadius;
          const workoutDash = ringCircumference * workoutPct;
          const dietDash = ringCircumference * dietPct;

          return (
            <Pressable
              key={dayNumber}
              disabled={!isPressable}
              accessibilityRole={isPressable ? 'button' : undefined}
              accessibilityLabel={isPressable ? `Day ${dayNumber}: ${summary}. Open details` : undefined}
              onPress={() => onDayPress?.(dayNumber)}
              style={({ pressed }) => [styles.dayCell, pressed && styles.pressed]}>
              <View style={styles.dayIndicatorWrap}>
                {isRest ? (
                  <View style={[styles.restDayMark, { backgroundColor: theme.chartEmpty }]} />
                ) : isActive ? (
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle cx={14} cy={14} r={9} fill="none" stroke={theme.chartEmpty} strokeWidth={2} opacity={0.5} />
                    <Circle
                      cx={14}
                      cy={14}
                      r={9}
                      fill="none"
                      stroke={theme.chartWorkout}
                      strokeWidth={2.5}
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringCircumference - workoutDash}
                      strokeLinecap="round"
                      transform="rotate(-90 14 14)"
                    />
                    <Circle
                      cx={14}
                      cy={14}
                      r={6}
                      fill="none"
                      stroke={theme.chartEmpty}
                      strokeWidth={2}
                      opacity={0.45}
                    />
                    <Circle
                      cx={14}
                      cy={14}
                      r={6}
                      fill="none"
                      stroke={theme.chartDiet}
                      strokeWidth={2.5}
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringCircumference - dietDash}
                      strokeLinecap="round"
                      transform="rotate(-90 14 14)"
                    />
                  </Svg>
                ) : (
                  <View style={[styles.emptyDayCircle, { borderColor: theme.chartEmpty }]} />
                )}
              </View>
              <ThemedText type="meta" themeColor="chartAxis" style={styles.dayNumber}>
                {dayNumber}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  weekDay: {
    width: '14.28%',
    alignItems: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Not space-between: a partial last row would be pushed out to both
    // edges, stranding the 31st under Saturday instead of beside the 30th.
    // Seven 14.28% cells fill the row exactly, so packing left is correct.
    justifyContent: 'flex-start',
    rowGap: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  dayIndicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  /** A short neutral dash: clearly "nothing scheduled", clearly not a failed ring. */
  restDayMark: {
    width: 12,
    height: 3,
    borderRadius: Radii.sm,
  },
  emptyDayCircle: {
    width: 20,
    height: 20,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  dayNumber: {
    marginTop: Spacing.one,
  },
});
