import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

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

export function MonthlyActivityCalendar({ entries, daysInMonth = 30 }: MonthlyActivityCalendarProps) {
  return (
    <View>
      <View style={styles.weekRow}>
        {weekDays.map((day) => (
          <View key={day.key} style={styles.weekDay}>
            <Text style={styles.weekDayLabel}>{day.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((dayNumber) => {
          const entry = entries.find((item) => item.date === dayNumber);
          const workoutPct = entry ? entry.workoutCompleted / Math.max(entry.workoutTotal, 1) : 0;
          const dietPct = entry ? entry.dietCompleted / Math.max(entry.dietTotal, 1) : 0;
          const hasWorkout = workoutPct > 0;
          const hasDiet = dietPct > 0;
          const isActive = hasWorkout || hasDiet;

          const ringRadius = 9;
          const ringCircumference = 2 * Math.PI * ringRadius;
          const workoutDash = ringCircumference * workoutPct;
          const dietDash = ringCircumference * dietPct;

          return (
            <View key={dayNumber} style={styles.dayCell}>
              <View style={styles.dayIndicatorWrap}>
                {isActive ? (
                  <Svg width={28} height={28} viewBox="0 0 28 28">
                    <Circle cx={14} cy={14} r={9} fill="none" stroke="#1F2937" strokeWidth={2} opacity={0.5} />
                    <Circle
                      cx={14}
                      cy={14}
                      r={9}
                      fill="none"
                      stroke="#3A7BFF"
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
                      stroke="#1F2937"
                      strokeWidth={2}
                      opacity={0.45}
                    />
                    <Circle
                      cx={14}
                      cy={14}
                      r={6}
                      fill="none"
                      stroke="#34D399"
                      strokeWidth={2.5}
                      strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                      strokeDashoffset={ringCircumference - dietDash}
                      strokeLinecap="round"
                      transform="rotate(-90 14 14)"
                    />
                  </Svg>
                ) : (
                  <View style={styles.emptyDayCircle} />
                )}
              </View>
              <Text style={styles.dayNumber}>{dayNumber}</Text>
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
    marginBottom: 8,
  },
  weekDay: {
    width: '14.28%',
    alignItems: 'center',
  },
  weekDayLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
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
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2C3A4E',
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  dayNumber: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 14,
    color: '#64748B',
  },
});
