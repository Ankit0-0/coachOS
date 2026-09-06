import { StyleSheet, View } from 'react-native';
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
};

type MonthlyActivityCalendarProps = {
  entries: DailyActivity[];
  daysInMonth?: number;
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

/** Read-only ring tracker of a client's daily workout/diet completion. */
export function MonthlyActivityCalendar({ entries, daysInMonth = 30 }: MonthlyActivityCalendarProps) {
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
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((dayNumber) => {
          const entry = entries.find((item) => item.date === dayNumber);
          const workoutPct = entry ? entry.workoutCompleted / Math.max(entry.workoutTotal, 1) : 0;
          const dietPct = entry ? entry.dietCompleted / Math.max(entry.dietTotal, 1) : 0;
          const isActive = workoutPct > 0 || dietPct > 0;

          const ringRadius = 9;
          const ringCircumference = 2 * Math.PI * ringRadius;
          const workoutDash = ringCircumference * workoutPct;
          const dietDash = ringCircumference * dietPct;

          return (
            <View key={dayNumber} style={styles.dayCell}>
              <View style={styles.dayIndicatorWrap}>
                {isActive ? (
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle cx={14} cy={14} r={9} fill="none" stroke={theme.chartTrack} strokeWidth={2} />
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
                    <Circle cx={14} cy={14} r={6} fill="none" stroke={theme.chartTrack} strokeWidth={2} />
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
                  <View style={[styles.emptyDayCircle, { borderColor: theme.chartTrack }]} />
                )}
              </View>
              <ThemedText type="meta" themeColor="chartAxis" style={styles.dayNumber}>
                {dayNumber}
              </ThemedText>
            </View>
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
    justifyContent: 'space-between',
    rowGap: Spacing.two,
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
